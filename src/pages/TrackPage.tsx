import { Dialog } from "@headlessui/react";
import { PlayIcon, StopIcon } from "@heroicons/react/24/outline";
import { DateTime, Duration } from "luxon";
import { FormEventHandler, useRef, useState } from "react";
import { QuickStats } from "../components/TrackPageStats";
import UpdatingDurationSince, {
  FormatedDuration,
} from "../components/UpdatingDurationSince";
import {
  endEntry,
  markEntryAsDeleted,
  startEntry,
  TaskEntry,
  useStore,
} from "../store";
import { dateTimeToInputMinMax } from "../util";

function QuickStartTask({
  label,
  timeSpend,
  timeSpendRefreshTS,
  activeTask,
}: {
  label: string;
  timeSpend: Duration;
  timeSpendRefreshTS: DateTime;
  activeTask?: TaskEntry;
}) {
  const create = () => {
    startEntry(label);
  };
  let is_active = false;
  if (activeTask?.label === label) {
    is_active = true;
  }

  return (
    <div className="flex p-2">
      <div className="mr-2 text-xl">
        {!is_active && <FormatedDuration duration={timeSpend} />}
        {is_active && (
          <UpdatingDurationSince
            startTS={timeSpendRefreshTS.toMillis()}
            additionalDuration={timeSpend}
          />
        )}
      </div>
      <div className="flex-grow">{label}</div>
      <button className="btn" onClick={create} disabled={is_active}>
        <PlayIcon className="mr-0.5 w-5" />
      </button>
    </div>
  );
}

function OpenTask({
  entry,
  isLatest,
  onClickOnFailedToEnd,
}: {
  entry: TaskEntry;
  isLatest: boolean;
  onClickOnFailedToEnd: () => void;
}) {
  return (
    <div className="flex flex-wrap space-x-1.5 bg-gray-100 p-2 dark:bg-stone-700">
      <div className="text-xl">
        <UpdatingDurationSince startTS={entry.start} />
      </div>
      <div className="flex-grow">{entry.label}</div>
      <div className="flex flex-nowrap space-x-1.5">
        <button className="btn" onClick={onClickOnFailedToEnd}>
          Failed to end?
        </button>
        {/* only the latest current running task shows normal stop button,
        other tasks only allow ending via "failed to end"
          as normally multiple tasks are not allowed at the same time */}
        {isLatest && (
          <button className="btn-error btn" onClick={() => endEntry(entry.id)}>
            <StopIcon className="mr-0.5 w-5" />
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

type Range = [start: number, end: number | undefined];

const timeRanges: { label: string; get: () => Range }[] = [
  {
    label: "Today",
    get: () => [DateTime.now().startOf("day").toMillis(), undefined],
  },
  {
    label: "Last 7 Days",
    get: () => [
      DateTime.now().startOf("day").minus({ days: 7 }).toMillis(),
      undefined,
    ],
  },
  {
    label: "Last 30 Days",
    get: () => [
      DateTime.now().startOf("day").minus({ days: 30 }).toMillis(),
      undefined,
    ],
  },
];

export function TrackPage() {
  const open_entries = useStore((state) => state.getOpenEntries());
  const lastEntry: TaskEntry | undefined =
    open_entries[open_entries.length - 1];
  const labelRef = useRef<HTMLInputElement>(null);
  const auto_complete = localStorage.getItem("autocomplete_enabled") === "true";
  const hide_track_page_stats =
    localStorage.getItem("hide_track_page_stats") === "true";
  const [failedToEndEntry, setFailedToEndEntry] = useState<TaskEntry | null>(
    null,
  );

  const create = () => {
    const label = labelRef.current?.value;
    if (label) {
      startEntry(label);
      labelRef.current.value = "";
    }
  };

  const openFailedToEndDialog = (entry: TaskEntry) => {
    setFailedToEndEntry(entry);
  };
  const closeFailedToEndDialog = () => {
    setFailedToEndEntry(null);
  };

  const [timeRange, setTimeRange] = useState<{ index: number; range: Range }>({
    index: 0,
    range: timeRanges[0].get(),
  });

  const quick_tasks = useStore.getState().getSortedUniqueLabels();
  const time_spent_today = useStore
    .getState()
    .getTimeSpendByLabel(...timeRange.range);
  const time_spent_today_fetch_time = DateTime.now();

  const quick_tasks_today: typeof quick_tasks = [];
  const quick_tasks_other: typeof quick_tasks = [];

  for (const task of quick_tasks) {
    if (time_spent_today.find(({ label }) => label === task.label)) {
      quick_tasks_today.push(task);
    } else {
      quick_tasks_other.push(task);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {!hide_track_page_stats && (
        <div className="self-center">
          <QuickStats />
        </div>
      )}
      <div className="flex grow flex-col overflow-hidden">
        <div className="mx-2 mt-2 flex items-center">
          <h2 className="text-lg font-medium">Last Tasks</h2>
          <div className="flex-grow"></div>
          <div className="latest-tasks-timerange flex">
            {timeRanges.map((range, index, array) => {
              let border =
                array.length - 1 === index
                  ? "rounded-r-lg border-l-0"
                  : index === 0
                  ? "rounded-l-lg border-r-0"
                  : "border-x-0";

              let active =
                timeRange.index === index
                  ? "bg-slate-600 hover:bg-slate-600 text-white"
                  : "";

              return (
                <button
                  key={index}
                  onClick={() => setTimeRange({ index, range: range.get() })}
                  className={`pv-2 border-collapse border-2 border-solid border-slate-300 px-2 py-1 font-medium hover:bg-slate-500 hover:text-white ${border} ${active}`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="px-2">
          Click play on a task here to quick start it. The displayed time is the
          time that was spent on this task in the time frame selected above.
        </p>
        <div className="grow overflow-y-scroll overscroll-auto">
          <div className="text-gray-800 dark:text-gray-200">
            {quick_tasks_today.map((task) => {
              const timeSpend =
                time_spent_today.find(({ label }) => label === task.label)
                  ?.timeSpend || Duration.fromMillis(0);

              return (
                <QuickStartTask
                  key={task.label}
                  label={task.label}
                  timeSpend={timeSpend}
                  timeSpendRefreshTS={time_spent_today_fetch_time}
                  activeTask={lastEntry}
                />
              );
            })}
          </div>
          {quick_tasks_other.length >= 1 && (
            <div className="divider">Older Tasks</div>
          )}
          <div className="text-gray-500 dark:text-gray-400">
            {quick_tasks_other.map((task) => {
              return (
                <QuickStartTask
                  key={task.label}
                  label={task.label}
                  timeSpend={Duration.fromMillis(0)}
                  timeSpendRefreshTS={time_spent_today_fetch_time}
                  activeTask={lastEntry}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={
          open_entries.length > 1
            ? { minHeight: "100px", overflowY: "scroll" }
            : {}
        }
      >
        {open_entries.map((entry, index) => (
          <OpenTask
            key={entry.id}
            entry={entry}
            isLatest={index === open_entries.length - 1}
            onClickOnFailedToEnd={openFailedToEndDialog.bind(null, entry)}
          />
        ))}
      </div>
      <form
        className="flex space-x-1.5 bg-slate-400 p-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          create();
        }}
      >
        {/* start a new task */}
        <input
          list={auto_complete ? "quick-tasks" : undefined}
          ref={labelRef}
          type="text"
          placeholder="task label"
          className="block
                    grow
                    rounded-md
                    border-transparent
                    bg-gray-500
                    placeholder:text-gray-400
                    focus:border-gray-400 focus:bg-white focus:ring-0"
        />
        {auto_complete && (
          <datalist id="quick-tasks">
            {quick_tasks.map(({ label }) => (
              <option key={label}>{label}</option>
            ))}
          </datalist>
        )}
        <button className="btn" onClick={create}>
          <PlayIcon className="mr-0.5 w-5" />
          Start
        </button>
      </form>
      {failedToEndEntry && (
        <FailedToEndDialog
          entry={failedToEndEntry}
          onClose={closeFailedToEndDialog}
        />
      )}
    </div>
  );
}

const FailedToEndQuickDurations = [
  Duration.fromObject({ minutes: 3 }),
  Duration.fromObject({ minutes: 5 }),
  Duration.fromObject({ minutes: 10 }),
  Duration.fromObject({ minutes: 15 }),
];

function FailedToEndDialog({
  entry,
  onClose,
}: {
  entry: TaskEntry;
  onClose: () => void;
}) {
  const onDeleteEntry = () => {
    markEntryAsDeleted(entry.id);
    onClose();
  };

  const onTurnEntryIntoBreak = () => {
    endEntry(entry.id, undefined, false, true);
    onClose();
  };

  enum Stage {
    Options,
    SetEndTime,
    SetDuration,
  }
  const [stage, setStage] = useState<Stage>(Stage.Options);

  const minEndTime = dateTimeToInputMinMax(DateTime.fromMillis(entry.start));
  const maxEndTime = dateTimeToInputMinMax(DateTime.now());

  const setEndTimeInputRef = useRef<HTMLInputElement | null>(null);

  const onSetEndTime: FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    if (
      setEndTimeInputRef.current &&
      setEndTimeInputRef.current.validity.valid
    ) {
      const [dateString, timeString] =
        setEndTimeInputRef.current.value.split("T");
      const date = DateTime.fromFormat(dateString, "yyyy-MM-dd");
      const { hour, minute } = DateTime.fromFormat(timeString, "T");
      const parsed_date_time = date.plus(Duration.fromObject({ hour, minute }));
      if (parsed_date_time.isValid) {
        if (
          parsed_date_time
            .diff(DateTime.fromMillis(entry.start))
            .shiftTo("minutes").minutes < 1
        ) {
          // 30 seconds is the minimum
          endEntry(
            entry.id,
            DateTime.fromMillis(entry.start).plus({ seconds: 30 }).toMillis(),
          );
        } else if (parsed_date_time.diffNow().toMillis() > 1) {
          // is in future
          return;
        } else {
          endEntry(entry.id, parsed_date_time.toMillis());
        }
        onClose();
      }
    }
  };

  const durationHoursInputRef = useRef<HTMLSelectElement | null>(null);
  const durationMinutesInputRef = useRef<HTMLSelectElement | null>(null);

  const onSetDuration = (duration: Duration) => {
    const newEnd = DateTime.fromMillis(entry.start).plus(duration);
    if (newEnd.toMillis() > DateTime.now().toMillis()) {
      throw new Error("End can not be in the future, duration is too long");
    }
    endEntry(entry.id, newEnd.toMillis());
    onClose();
  };

  const onSetCustomDuration: FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault();
    if (durationHoursInputRef.current && durationMinutesInputRef.current) {
      if (
        durationHoursInputRef.current.value !== "none" &&
        durationMinutesInputRef.current.value !== "none"
      ) {
        const duration = Duration.fromObject({
          hours: Number(durationHoursInputRef.current.value),
          minutes: Number(durationMinutesInputRef.current.value),
        });
        onSetDuration(duration);
      } else {
        // todo user feedback? please select both minutes and hours
      }
    }
  };

  return (
    <>
      <Dialog open={true} onClose={onClose} className="relative z-50">
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {/* The actual dialog panel  */}
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-4">
            <Dialog.Title as="h3" className="text-lg font-bold">
              Failed to end '{entry.label}'?
            </Dialog.Title>

            <table className="m mx-5 my-2 text-gray-500">
              <tbody>
                <tr>
                  <td>Label</td>
                  <td>{entry.label}</td>
                </tr>
                <tr>
                  <td>Start Time</td>
                  <td>{new Date(entry.start).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Duration</td>
                  <td>
                    <UpdatingDurationSince startTS={entry.start} />
                  </td>
                </tr>
              </tbody>
            </table>

            {stage === Stage.Options && (
              <>
                <Dialog.Description>
                  You forgot to stop this entry? You now have the following
                  options to fix the mistake.
                </Dialog.Description>

                <button
                  className="basic-btn"
                  onClick={() => setStage(Stage.SetEndTime)}
                >
                  Stop entry and set end time
                </button>
                <button
                  className="basic-btn"
                  onClick={() => setStage(Stage.SetDuration)}
                >
                  Stop entry and set duration
                </button>
                <button className="basic-btn" onClick={onTurnEntryIntoBreak}>
                  Stop entry and mark it as break (not tracked)
                </button>
                <button
                  className="basic-btn bg-red-500 hover:bg-red-700"
                  onClick={onDeleteEntry}
                >
                  Delete the entry
                </button>
              </>
            )}

            {stage === Stage.SetEndTime && (
              <>
                <Dialog.Description>
                  Set the time when the entry should have ended.
                </Dialog.Description>
                <form onSubmit={onSetEndTime}>
                  <input
                    ref={setEndTimeInputRef}
                    type="datetime-local"
                    min={minEndTime}
                    max={maxEndTime}
                    required
                  />
                  <button className="basic-btn" formAction={"submit"}>
                    Set End Time
                  </button>
                </form>
              </>
            )}

            {stage === Stage.SetDuration && (
              <>
                <Dialog.Description>
                  Set the duration how long the entry took.
                </Dialog.Description>
                <div className="flex">
                  {FailedToEndQuickDurations.map((duration) => (
                    <button
                      className="basic-btn whitespace-nowrap text-xs"
                      onClick={() => onSetDuration(duration)}
                    >
                      {duration.toHuman({ unitDisplay: "short" })}
                    </button>
                  ))}
                </div>
                <h4>Custom Duration</h4>
                <form onSubmit={onSetCustomDuration}>
                  <div className={"flex items-center"}>
                    <select
                      className="select max-w-xs"
                      ref={durationHoursInputRef}
                    >
                      <option disabled selected value={"none"}>
                        Hours
                      </option>
                      {Array(24)
                        .fill(0)
                        .map((_, i) => (
                          <option value={i}>{i}</option>
                        ))}
                    </select>
                    <span className="text-3xl">:</span>
                    <select
                      className="select max-w-xs"
                      ref={durationMinutesInputRef}
                    >
                      <option disabled selected value={"none"}>
                        Minutes
                      </option>
                      {Array(60)
                        .fill(0)
                        .map((_, i) => (
                          <option value={i}>{i}</option>
                        ))}
                    </select>
                    <button
                      className="basic-btn whitespace-nowrap text-xl"
                      formAction="submit"
                    >
                      Set
                    </button>
                  </div>
                </form>
              </>
            )}

            <br />
            {stage !== Stage.Options && (
              <button
                className="basic-btn"
                onClick={() => setStage(Stage.Options)}
              >
                Back
              </button>
            )}
            <button className="basic-btn" onClick={onClose}>
              Cancel
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
