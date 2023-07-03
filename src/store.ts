import { DateTime, Duration } from "luxon";
import { create } from "zustand";
import { getEntriesInTimeframeCutToIt, getMonthsOfEntry } from "./entryMaths";

// define shorter versions so we save a tiny bit bandwich

const enum UpdateActionType {
  StartEntryType = "SE",
  EndEntryType = "EE",
  EditEntryType = "ME", // modify entry
  DeleteEntryType = "DEL",
  ImportType = "I",
}

type StartEntry = {
  type: UpdateActionType.StartEntryType;
  /** unique id of entry */
  id: string;
  label: string;
  ts: number;
};
type EndEntry = {
  type: UpdateActionType.EndEntryType;
  /** unique id of entry */
  id: string;
  ts: number;
  /** whether it was ended automatically because of a new entry */
  auto?: true;
  is_break: boolean;
};
type EditEntry = {
  type: UpdateActionType.EditEntryType;
  /** unique id of entry */
  id: string;
  new_start?: number;
  new_end?: number;
  new_label?: string;
  new_is_break?: boolean;
};

/** marks entry as deleted, don't really delete it as we still want to show it in the history */
type DeleteEntry = {
  type: UpdateActionType.DeleteEntryType;
  /** unique id of entry */
  id: string;
};

type ImportData = {
  type: UpdateActionType.ImportType;
  entries: TaskEntry[];
};

type StatusUpdateAction =
  | StartEntry
  | EndEntry
  | EditEntry
  | DeleteEntry
  | ImportData;

export type StatusUpdate = {
  action: StatusUpdateAction;
  user: string;
  /** action timestamp might differ from end,
   *  for example the "failed to end" button will ask the user for the actual end time.
   *  also edit actions need time stamp of edit for the history  */
  action_ts: number;
};

export type TaskEntry = {
  /** unique id of entry */
  id: string;
  label: string;
  start: number;
  end?: number;
  /** difference between end-start, cached value for speed */
  duration?: number;
  /** Whether entry is marked as deleted */
  deleted?: true;
  /** for the gtimelog trackmode - if item is break it shall not be counted */
  is_break?: boolean;
  /** Whether entry is was automaticaly ended by the next entry */
  auto?: true;
};

type ActionHistoryEntry = {
  /** task id, if any */
  id?: TaskEntry["id"];
  /** author of the state update */
  who: string;
  /** string describing the change */
  what: string;
  /** when action was performed, basically StatusUpdate.action_ts */
  when: number;
};

type LabelData = {
  usage_count: number;
  last_used: number;
};

interface Store {
  entries: TaskEntry[];
  actionHistory: ActionHistoryEntry[];
  /** unique labels, how often they were used and when they were used last
   *
   * labels of deleted and break entries are not counted.
   */
  labels: { [label: string]: LabelData | undefined };
  /** months that have events */
  monthsWithEntries: { month: number; year: number }[];
  digestUpdate(update: StatusUpdate): void;
  /** gets all entries that have no end, sorted by start time */
  getOpenEntries(): TaskEntry[];
  /** all entries that are neither a break nor deleted */
  getTrackedEntries(): TaskEntry[];
  getEntryHistory(entry_id: TaskEntry["id"]): ActionHistoryEntry[];
  /** returns a sorted list of last & often used labels for quick start
   * doesn't return labels with no usages (can result from deleted entries) */
  getSortedUniqueLabels(): ({ label: string } & LabelData)[];
  /** returns an array of how much time was spend on what labels since the specified timestamp
   * it only takes ended tasks into account
   */
  getTimeSpendByLabel(
    startTS: number,
    endTS?: number
  ): { label: string; timeSpend: Duration }[];
  refreshMonthsWithEntry(): void;

  // internal (does not need to be saved anywhere)
  /** this exists, so that the immutable output of the getTrackedEntries function does not change when entries don't have changed */
  internal_lastEntries: TaskEntry[];
  /** cache for the filtered entries so that it's immutable */
  internal_lastEntries_filtered: TaskEntry[];
}

export const useStore = create<Store>((set, get) => ({
  entries: [],
  actionHistory: [],
  labels: {},
  monthsWithEntries: [],
  digestUpdate(update: StatusUpdate) {
    const { action } = update;
    if (action.type === UpdateActionType.ImportType) {
      set((store) => {
        const entriesToImport: TaskEntry[] = [];
        const historyEntries: ActionHistoryEntry[] = [];
        let labels = { ...store.labels };
        for (const importedEntry of action.entries) {
          if (store.entries.find((entry) => entry.id == importedEntry.id)) {
            // entry already exists
            console.warn("entry already exists, ignoring it", {
              store: store.entries,
              importedEntry,
            });
            continue;
          }
          entriesToImport.push(importedEntry);
          // generate history entries
          historyEntries.push({
            id: importedEntry.id,
            who: update.user,
            what: `imported Entry`,
            when: update.action_ts,
          });
          // update labels
          const { label } = importedEntry;
          labels[label] = {
            usage_count: (store.labels[label]?.usage_count || 0) + 1,
            last_used: importedEntry.start,
          };
        }
        return {
          entries: [...store.entries, ...entriesToImport],
          actionHistory: [...store.actionHistory, ...historyEntries],
          labels,
        };
      });
      get().refreshMonthsWithEntry();
    } else if (action.type === UpdateActionType.StartEntryType) {
      if (get().entries.findIndex(({ id }) => id === action.id) !== -1) {
        console.warn(
          "Ignoring adding event with an id that already exists: ",
          action.id
        );
        return;
      }
      const { id, label, ts: start_ts } = action;
      const newEntry: TaskEntry = {
        id,
        label,
        start: start_ts,
      };
      const historyEntry: ActionHistoryEntry = {
        id,
        who: update.user,
        what: `started Entry`,
        when: update.action_ts,
      };
      set((store) => {
        let label_usage_count = (store.labels[label]?.usage_count || 0) + 1;
        return {
          entries: [...store.entries, newEntry],
          actionHistory: [...store.actionHistory, historyEntry],
          labels: {
            ...store.labels,
            [label]: {
              usage_count: label_usage_count,
              last_used: start_ts,
            } as LabelData,
          },
        };
      });
    } else if (action.type === UpdateActionType.EndEntryType) {
      const entryIndex = get().entries.findIndex(({ id }) => id === action.id);
      if (entryIndex === -1) {
        console.error("received end action for an unknown entry");
        const historyEntry: ActionHistoryEntry = {
          id: action.id,
          who: update.user,
          what: `tried to end entry but it does not exist (yet?), ignoring action: ${JSON.stringify(
            action
          )}`,
          when: update.action_ts,
        };
        set((state) => ({
          actionHistory: [...state.actionHistory, historyEntry],
        }));
        return;
      }
      set((store) => {
        const { id, ts: end_ts } = action;
        const entry = store.entries[entryIndex];
        entry.end = end_ts;
        entry.duration = end_ts - entry.start;
        entry.auto = action.auto;
        if (action.is_break) {
          entry.is_break = action.is_break;
          // remove label from being counted (does not make sense for breaks)
          const old_label = this.labels[entry.label];
          if (old_label) {
            old_label.usage_count--;
          }
        }
        const historyEntry: ActionHistoryEntry = {
          id,
          who: update.user,
          what: `${action.auto ? "automatically " : ""}ended Entry${
            action.is_break ? " and marked it as a break" : ""
          }`,
          when: update.action_ts,
        };
        return {
          entries: [...store.entries],
          actionHistory: [...store.actionHistory, historyEntry],
        };
      });
    } else if (action.type === UpdateActionType.DeleteEntryType) {
      const entryIndex = get().entries.findIndex(({ id }) => id === action.id);
      if (entryIndex === -1) {
        console.error("received end action for an unknown entry");
        const historyEntry: ActionHistoryEntry = {
          id: action.id,
          who: update.user,
          what: `tried to delete entry but it does not exist (yet?), ignoring action: ${JSON.stringify(
            action
          )}`,
          when: update.action_ts,
        };
        set((state) => ({
          actionHistory: [...state.actionHistory, historyEntry],
        }));
        return;
      }
      set((store) => {
        const { id } = action;
        const entry = store.entries[entryIndex];
        entry.deleted = true;
        const historyEntry: ActionHistoryEntry = {
          id,
          who: update.user,
          what: `marked Entry as deleted`,
          when: update.action_ts,
        };
        const label = this.labels[entry.label];
        if (label) {
          label.usage_count--;
        }
        return {
          entries: [...store.entries],
          actionHistory: [...store.actionHistory, historyEntry],
        };
      });
    } else if (action.type === UpdateActionType.EditEntryType) {
      const entryIndex = get().entries.findIndex(({ id }) => id === action.id);
      if (entryIndex === -1) {
        console.error("received end action for an unknown entry");
        const historyEntry: ActionHistoryEntry = {
          id: action.id,
          who: update.user,
          what: `tried to edit entry but it does not exist (yet?), ignoring action: ${JSON.stringify(
            action
          )}`,
          when: update.action_ts,
        };
        set((state) => ({
          actionHistory: [...state.actionHistory, historyEntry],
        }));
        return;
      }
      set((store) => {
        const { id } = action;
        const entry = store.entries[entryIndex];
        const history = [];
        if (action.new_label) {
          history.push(
            `changed label: '${entry.label}' -> '${action.new_label}'`
          );
          const old_label = this.labels[entry.label];
          if (old_label) {
            old_label.usage_count--;
          }
          entry.label = action.new_label;
          const new_label = this.labels[action.new_label];
          if (new_label) {
            new_label.usage_count++;
          } else {
            this.labels[action.new_label] = {
              usage_count: 1,
              last_used: entry.start,
            };
          }
        }
        if (action.new_start) {
          history.push(
            `changed start: '${entry.start}' -> '${action.new_start}'`
          );
          entry.start = action.new_start;
        }
        if (action.new_end) {
          history.push(`changed end: '${entry.end}' -> '${action.new_end}'`);
          entry.end = action.new_end;
        }
        if (entry.end && (action.new_start || action.new_end)) {
          entry.duration = entry.end - entry.start;
        }
        if (
          typeof action.new_is_break !== "undefined" &&
          entry.is_break != action.new_is_break
        ) {
          history.push(
            `changed is break: ${entry.is_break} -> ${action.new_is_break}`
          );
          entry.is_break = action.new_is_break;
          if (action.new_is_break) {
            // remove label from being counted (does not make sense for breaks)
            const old_label = this.labels[entry.label];
            if (old_label) {
              old_label.usage_count--;
            }
          } else {
            // re add label
            const new_label = this.labels[entry.label];
            if (new_label) {
              new_label.usage_count++;
            } else {
              this.labels[entry.label] = {
                usage_count: 1,
                last_used: entry.start,
              };
            }
          }
        }
        const historyEntry: ActionHistoryEntry = {
          id,
          who: update.user,
          what: `Edit entry: ${history.join(" ,")}`,
          when: update.action_ts,
        };
        return {
          entries: [...store.entries],
          actionHistory: [...store.actionHistory, historyEntry],
        };
      });
    }
  },
  getOpenEntries(): TaskEntry[] {
    return get()
      .entries.filter(
        ({ end, deleted }) => typeof end === "undefined" && !deleted
      )
      .sort((a, b) => a.start - b.start);
  },
  internal_lastEntries: [],
  internal_lastEntries_filtered: [],
  getTrackedEntries() {
    const entries = get().entries;
    if (entries === this.internal_lastEntries) {
      return this.internal_lastEntries_filtered;
    } else {
      this.internal_lastEntries = entries;
      return (this.internal_lastEntries_filtered = entries.filter(
        ({ deleted, is_break }) => !is_break && !deleted
      ));
    }
  },
  getEntryHistory(entry_id) {
    return get().actionHistory.filter(({ id }) => id === entry_id);
  },
  getSortedUniqueLabels() {
    const labels = get().labels;
    // const now = Date.now();
    const scored = Object.keys(labels)
      .map((key) => {
        const label = labels[key];
        if (!label || label.usage_count < 1) {
          return undefined;
        }
        // const score_last_used = 1 / (now - label.last_used);
        // const score_usage_count =
        //   1 - 1 / (label.usage_count < 1 ? 1 : Math.abs(label.usage_count) + 1);
        // const score = (score_last_used * 5 + score_usage_count) / 6;

        return {
          label: key,
          ...label,
          score: label.last_used,
        };
      })
      .filter((v) => !!v) as {
      score: number;
      usage_count: number;
      last_used: number;
      label: string;
    }[];
    return scored.sort((a, b) => a.score - b.score).reverse();
  },
  getTimeSpendByLabel(startTS, endTS = DateTime.now().toMillis()) {
    // make sure to also include entries that are at the edge of the start/end
    const entries = getEntriesInTimeframeCutToIt(
      get().getTrackedEntries(),
      startTS,
      endTS
    );

    const data: { [label: string]: number } = {};
    for (const { label, duration } of entries) {
      if (!duration) {
        continue;
      }
      if (data[label]) {
        data[label] += duration;
      } else {
        data[label] = duration;
      }
    }

    return Object.keys(data).map((key) => ({
      label: key,
      timeSpend: Duration.fromMillis(data[key]),
    }));
  },
  refreshMonthsWithEntry() {
    set((store) => {
      const months = store.entries
        .map(getMonthsOfEntry)
        .flat(1)
        .sort((a, b) => (a.year - b.year) * 1000 + (a.month - b.month));
      const monthsWithEntries = months.filter(
        (value, i, array) =>
          value.year !== array[i - 1]?.year ||
          value.month !== array[i - 1]?.month
      );
      return {
        monthsWithEntries,
      };
    });
  },
}));

if (localStorage.getItem("devmode") === "true") {
  (window as any).store = () => useStore.getState();
}

let initialized = false;
let initialisation_started = false;

export async function init() {
  if (initialized) {
    return;
  }
  if (initialisation_started) {
    throw new Error("initialisation was already started");
  }
  initialisation_started = true;
  await window.webxdc.setUpdateListener((update) => {
    useStore.getState().digestUpdate(update.payload);

    if (update.max_serial === update.serial) {
      // last update in batch
      // store.getState().
    }
  });
  useStore.getState().refreshMonthsWithEntry();
  initialized = true;
}

function makeUpdate(action: StatusUpdateAction): StatusUpdate {
  return {
    action,
    user: window.webxdc.selfAddr,
    action_ts: Date.now(),
  };
}

export function startEntry(label: string) {
  if (label.length < 1) {
    throw new Error("Label is to short");
  }

  const openEntries = useStore.getState().getOpenEntries();
  if (openEntries.length >= 1) {
    // only close the latest one, the others are probably "failed to end"
    endEntry(openEntries[openEntries.length - 1].id, Date.now(), true);
  }

  const id = `${window.webxdc.selfAddr}:${Date.now()}`;

  const ts = Date.now();

  window.webxdc.sendUpdate(
    {
      payload: makeUpdate({
        type: UpdateActionType.StartEntryType,
        id,
        label,
        ts,
      }),
    },
    `Timetracking entry ${id} started: '${label}' ${new Date(
      ts
    ).toLocaleString()}`
  );
}

export function editEntry(id: string, changed: Omit<EditEntry, "type" | "id">) {
  window.webxdc.sendUpdate(
    {
      payload: makeUpdate({
        type: UpdateActionType.EditEntryType,
        ...changed,
        id,
      }),
    },
    `Timetracking entry '${id}' edited: ${JSON.stringify(changed)}
    ).toLocaleString()}`
  );
}

export function endEntry(
  id: string,
  end = Date.now(),
  auto = false,
  is_break = false
) {
  const entry_label = useStore
    .getState()
    .entries.find((entry) => entry.id === id)?.label;
  if (!entry_label) {
    throw new Error("can not end an entry that does not exist");
  }

  window.webxdc.sendUpdate(
    {
      payload: makeUpdate({
        type: UpdateActionType.EndEntryType,
        id,
        ts: end,
        auto: auto ? true : undefined,
        is_break,
      }),
    },
    `Timetracking entry '${id}' ended: '${entry_label}' ${new Date(
      end
    ).toLocaleString()}`
  );
}

export function markEntryAsDeleted(id: string) {
  const entry_label = useStore
    .getState()
    .entries.find((entry) => entry.id === id)?.label;
  if (!entry_label) {
    throw new Error("can not mark an entry as deleted that does not exist");
  }

  window.webxdc.sendUpdate(
    {
      payload: makeUpdate({
        type: UpdateActionType.DeleteEntryType,
        id,
      }),
    },
    `Timetracking entry '${id}' marked as deleted: '${entry_label}'}`
  );
}

export function importEntries(entries: TaskEntry[]) {
  if (entries.length == 0) {
    throw new Error("no entries in import");
  }

  window.webxdc.sendUpdate(
    {
      payload: makeUpdate({
        type: UpdateActionType.ImportType,
        entries,
      }),
    },
    `Import of ${entries.length} entries`
  );
}
