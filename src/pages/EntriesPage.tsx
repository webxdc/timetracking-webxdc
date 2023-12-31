import {
  PencilIcon,
  PlayIcon,
  PowerIcon,
  StopIcon,
  TrashIcon,
  VariableIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import {
  defaultRangeExtractor,
  useVirtualizer,
  Range,
} from "@tanstack/react-virtual";
import { DateTime, Duration, Interval } from "luxon";
import {
  useEffect,
  useRef,
  useState,
  Fragment,
  useMemo,
  useCallback,
} from "react";
import { Dialog, Transition } from "@headlessui/react";

import { useStore, TaskEntry, markEntryAsDeleted, endEntry } from "../store";
import { useNavigate } from "react-router-dom";

enum EntryType {
  Daymarker,
  TaskEntry,
}

type Daymarker = { id: string; type: EntryType.Daymarker; ts: number };

export function EntriesPage() {
  const navigate = useNavigate();
  const raw_entries = useStore((store) => store.entries);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showBreaks, setShowBreaks] = useState(
    localStorage.getItem("showBreaks") !== "false",
  );

  const toggleShowBreaks = () => {
    const newValue = !showBreaks;
    localStorage.setItem("showBreaks", JSON.stringify(newValue));
    setShowBreaks(newValue);
  };

  const { entries, stickyIndexes } = useMemo(() => {
    let entries: ((TaskEntry & { type: EntryType.TaskEntry }) | Daymarker)[] =
      [];

    const sortedEntries = [...raw_entries].sort((a, b) => a.start - b.start);
    // for debugging, sort entries via duration .sort((a, b) => (a.duration || 0) - (b.duration || 0));

    let currentEndOfDay = 0;
    const stickyIndexes = [];
    for (const entry of sortedEntries) {
      const { deleted, is_break } = entry;
      if ((!showDeleted && deleted) || (!showBreaks && is_break)) {
        continue;
      }

      if (entry.start > currentEndOfDay) {
        const newEndOfDay = DateTime.fromMillis(entry.start).endOf("day");
        const index = entries.push({
          id: `daymarker${newEndOfDay.toUTC()}`,
          type: EntryType.Daymarker,
          ts: newEndOfDay.toMillis(),
        });
        stickyIndexes.push(index - 1);
        currentEndOfDay = newEndOfDay.toMillis();
      }

      const newEntry = entry as TaskEntry & { type: EntryType.TaskEntry };
      newEntry.type = EntryType.TaskEntry;
      entries.push(newEntry);
    }

    return { entries, stickyIndexes };
  }, [raw_entries, showDeleted, showBreaks]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const activeStickyIndexRef = useRef<number>(0);
  const isSticky = (index: number) => stickyIndexes.includes(index);
  const isActiveSticky = (index: number) =>
    activeStickyIndexRef.current === index;

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (isSticky(index) ? 40 : 81),
    overscan: 5,
    getItemKey: (index) => entries[index].id,
    rangeExtractor: useCallback(
      (range: Range) => {
        activeStickyIndexRef.current =
          [...stickyIndexes]
            .reverse()
            .find((index) => range.startIndex >= index) || 0;

        const next = new Set([
          activeStickyIndexRef.current,
          ...defaultRangeExtractor(range),
        ]);

        return [...next].sort((a, b) => a - b);
      },
      [stickyIndexes],
    ),
  });

  // start at end of list
  useEffect(() => {
    if (entries.length) {
      rowVirtualizer.scrollToIndex(entries.length - 1);
    }
  }, []);

  const [contextMenuShown, setContextMenuShown] = useState(false);

  return (
    <div className="flex h-full w-full flex-col">
      <div>
        <div className="flex py-1">
          <h1
            className={`grow pl-3 text-xl font-bold whitespace-nowrap text-ellipsis overflow-hidden`}
          >
            Entries
          </h1>
          <button aria-label="menu" onClick={() => setContextMenuShown(true)}>
            <EllipsisVerticalIcon className="m-0.5 w-5" />
          </button>
        </div>
        <Transition appear show={contextMenuShown} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-10"
            onClose={() => setContextMenuShown(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-20" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-start justify-end p-2 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="entries-menu">
                    <div className="flex flex-col items-start">
                      <button
                        onClick={() => {
                          setShowDeleted(!showDeleted);
                          setContextMenuShown(false);
                        }}
                      >
                        {showDeleted ? (
                          <EyeSlashIcon className="icon" />
                        ) : (
                          <EyeIcon className="icon" />
                        )}
                        {showDeleted ? "Hide Deleted" : "Show Deleted"}
                      </button>
                      <button
                        onClick={() => {
                          toggleShowBreaks();
                          setContextMenuShown(false);
                        }}
                      >
                        {showBreaks ? (
                          <EyeSlashIcon className="icon" />
                        ) : (
                          <EyeIcon className="icon" />
                        )}

                        {showBreaks ? "Hide Breaks" : "Show Breaks"}
                      </button>
                      <button onClick={() => navigate("/entries/create")}>
                        <PlusIcon className="icon" />
                        Manually Create Entry
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
        <hr />
      </div>
      <div
        ref={parentRef}
        className="h-full w-full flex-grow overflow-auto overscroll-auto entries-page-entries"
      >
        {entries.length === 0 && (
          <div className="w-full h-full flex flex-col justify-center">
            <div className="text-center">No Entries yet</div>
          </div>
        )}
        {entries.length !== 0 && (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const entry = entries[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={
                    entry.type === EntryType.Daymarker
                      ? " bg-gray-300 dark:bg-gray-800"
                      : ""
                    //  virtualRow.index % 2
                    // ? "bg-slate-100 dark:bg-slate-500"
                    // : "bg-slate-200 dark:bg-slate-600"
                  }
                  style={{
                    ...(isSticky(virtualRow.index)
                      ? {
                          zIndex: 1,
                        }
                      : {}),
                    ...(isActiveSticky(virtualRow.index)
                      ? {
                          position: "sticky",
                        }
                      : {
                          position: "absolute",
                          transform: `translateY(${virtualRow.start}px)`,
                        }),
                    top: 0,
                    left: 0,
                    width: "100%",
                  }}
                >
                  {entry.type === EntryType.Daymarker && (
                    <DayMarker ts={entry.ts} />
                  )}
                  {entry.type === EntryType.TaskEntry && (
                    <Entry
                      entry={entry}
                      onEdit={(id: TaskEntry["id"]) =>
                        navigate(`/entries/${id}`)
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DayMarker({ ts }: { ts: number }) {
  const time = DateTime.fromMillis(ts);
  return (
    <div className="p-2">
      <b>{time.weekdayLong}</b> - {time.toLocaleString()}
    </div>
  );
}

function Entry({
  entry,
  onEdit,
}: {
  entry: TaskEntry;
  onEdit: (id: TaskEntry["id"]) => void;
}) {
  const [showDeleteConfirmation, setShowDeleteConfirm] = useState(false);

  const startTime = DateTime.fromMillis(entry.start).toLocaleString(
    DateTime.TIME_SIMPLE,
  );
  const endTime = entry.end
    ? DateTime.fromMillis(entry.end).toLocaleString(DateTime.TIME_SIMPLE)
    : null;

  let duration =
    entry.duration &&
    durationToHumanShort(Duration.fromDurationLike(entry.duration));

  const reallyDeleteEntry = () => {
    setShowDeleteConfirm(false);
    markEntryAsDeleted(entry.id);
  };

  const deleteEntry = () => {
    // todo confirmation dialog
    setShowDeleteConfirm(true);
  };
  const stopEntry = () => {
    endEntry(entry.id);
  };
  return (
    <div className={`p-1 flex entries-page-entry`}>
      <div className="flex flex-col mr-1" style={{ minWidth: "1.5rem" }}>
        {!entry.end && (
          <PlayIcon className="m-0.5 w-5 text-green-800 dark:text-green-400" />
        )}
        {entry.is_break && <PowerIcon className="m-0.5 w-5" />}
        {entry.deleted && <TrashIcon className="m-0.5 w-5 text-red-800" />}
        {entry.auto && <VariableIcon className="m-0.5 w-5" />}
      </div>
      <div className="flex flex-col flex-grow justify-between">
        <div
          className={`${entry.deleted ? "text-red-800 line-through" : ""} ${
            entry.end || entry.deleted
              ? ""
              : "text-green-800 dark:text-green-400"
          }`}
        >
          {entry.label}
        </div>
        <div className="flex">
          {!entry.duration && (
            <button
              className="entries-page-entry-btn m-0.5"
              aria-label="stop entry"
              onClick={stopEntry}
            >
              <StopIcon className="mr-0.5 w-5" /> Stop
            </button>
          )}
          <button
            className="entries-page-entry-btn m-0.5"
            aria-label="edit entry"
            onClick={onEdit.bind(null, entry.id)}
          >
            <PencilIcon className="mr-0.5 w-5" /> Edit
          </button>
          {!entry.deleted && (
            <button
              className="entries-page-entry-btn m-0.5"
              aria-label="delete entry"
              onClick={deleteEntry}
            >
              <TrashIcon className="mr-0.5 w-5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex flex-col items-end ${
          entry.deleted || entry.is_break
            ? " text-gray-400 dark:text-gray-500"
            : ""
        }`}
      >
        <div>{startTime}</div>
        <div className="border-r-4 pr-1 border-solid border-lime-400 dark:border-lime-500">
          {duration}
          {!entry.duration && <UpdatingDurationSince startTS={entry.start} />}
        </div>
        <div>{endTime || "..."}</div>
      </div>

      <Transition appear show={showDeleteConfirmation} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setShowDeleteConfirm(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Confirm Entry Deletion
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      You are about to delete the following entry:
                      <div className="inline-block rounded border border-solid border-stone-400 px-2 py-1">
                        <div>Label: {entry.label}</div>
                        <div>
                          Start:{" "}
                          {DateTime.fromMillis(entry.start).toLocaleString(
                            DateTime.DATETIME_MED,
                          )}
                        </div>
                        <div>
                          End:{" "}
                          {entry.end &&
                            DateTime.fromMillis(entry.end).toLocaleString(
                              DateTime.DATETIME_MED,
                            )}
                        </div>
                        <div>Duration: {duration}</div>
                      </div>
                    </p>
                  </div>

                  <div className="mt-4 flex justify-between">
                    <button
                      type="button"
                      className="mr-1 inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ml-1 inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={() => reallyDeleteEntry()}
                    >
                      Delete Entry
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

function UpdatingDurationSince({ startTS }: { startTS: number }) {
  const [text, setText] = useState("??:??:??");

  useEffect(() => {
    const start = DateTime.fromMillis(startTS);
    const update = () => {
      let duration = Interval.fromDateTimes(start, DateTime.now()).toDuration();
      setText(durationToHumanShort(duration));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTS]);

  return <>{text}</>;
}

export function EntryModal({ entry }: any) {
  return <div>Entry: {JSON.stringify(entry)}</div>;
}

function durationToHumanShort(duration: Duration) {
  const { hours, minutes, seconds } = duration.shiftTo(
    "hours",
    "minutes",
    "seconds",
  );

  let result = "";

  if (hours) {
    result += `${hours} h `;
  }

  if (minutes) {
    result += `${minutes} min `;
  }

  if (seconds && !hours && !minutes) {
    result += `${Math.floor(seconds)}s`;
  }

  return result;
}
