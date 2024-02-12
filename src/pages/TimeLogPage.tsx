import {
  PaperAirplaneIcon,
  PauseCircleIcon,
  PlayIcon,
  StopIcon,
} from "@heroicons/react/24/outline";

import { FormEvent, MouseEventHandler, useRef, useState } from "react";
import FailedToEndDialog from "../components/FailedToEndDialog";
import { QuickStats } from "../components/TrackPageStats";
import UpdatingDurationSince from "../components/UpdatingDurationSince";
import { endEntry, startEntry, TaskEntry, useStore } from "../store";

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

export function TimeLogPage() {
  const [last_open_entry, ...other_open_entries] = useStore((state) =>
    state.getOpenEntries(),
  ).reverse();
  other_open_entries.reverse();
  const lastEntry: TaskEntry | undefined =
    other_open_entries[other_open_entries.length - 1];
  const labelRef = useRef<HTMLInputElement>(null);
  const auto_complete = localStorage.getItem("autocomplete_enabled") === "true";
  const hide_track_page_stats =
    localStorage.getItem("hide_track_page_stats") === "true";
  const [failedToEndEntry, setFailedToEndEntry] = useState<TaskEntry | null>(
    null,
  );

  const openFailedToEndDialog = (entry: TaskEntry) => {
    setFailedToEndEntry(entry);
  };
  const closeFailedToEndDialog = () => {
    setFailedToEndEntry(null);
  };

  const quick_tasks = useStore.getState().getSortedUniqueLabels();

  const deleteCurrentEntry: MouseEventHandler<HTMLButtonElement> = (ev) => {
    ev.preventDefault();
    // TODO
  };

  const markCurrentEntryAsBreak: MouseEventHandler<HTMLButtonElement> = (
    ev,
  ) => {
    ev.preventDefault();
    // TODO
  };

  const start: MouseEventHandler<HTMLButtonElement> = (ev) => {
    ev.preventDefault();
    // TODO
    startEntry("Unlabeled Task (timelog mode)");
  };

  const labelCurrentEntry = (ev: MouseEvent | FormEvent) => {
    ev.preventDefault();

    const label = labelRef.current?.value;
    if (label) {
      // TODO
      labelRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full flex-col">
      {!hide_track_page_stats && (
        <div className="self-center">
          <QuickStats />
        </div>
      )}
      <div className="flex grow flex-col overflow-hidden"></div>

      <div
        style={
          other_open_entries.length > 1
            ? { minHeight: "100px", overflowY: "scroll" }
            : {}
        }
      >
        {other_open_entries.map((entry, index) => (
          <OpenTask
            key={entry.id}
            entry={entry}
            isLatest={false}
            onClickOnFailedToEnd={openFailedToEndDialog.bind(null, entry)}
          />
        ))}
      </div>
      <div className="flex space-x-1.5 bg-slate-400 p-2">
        {last_open_entry ? (
          <form onSubmit={labelCurrentEntry} className="flex flex-col grow">
            <div className="flex grow items-baseline">
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
                required
              />
              <div className="text-black text-lg ml-2 font-mono">
                <UpdatingDurationSince startTS={last_open_entry.start} />
              </div>
              {auto_complete && (
                <datalist id="quick-tasks">
                  {quick_tasks.map(({ label }) => (
                    <option key={label}>{label}</option>
                  ))}
                </datalist>
              )}
            </div>
            <div className="flex text-black justify-evenly mt-2">
              <button className="btn btn-error" onClick={deleteCurrentEntry}>
                Stop &amp; Delete Entry
              </button>
              <button className="btn" onClick={markCurrentEntryAsBreak}>
                Mark as Break
                <PauseCircleIcon className="w-5" />
              </button>
              <button className="btn btn-success" formAction="submit">
                Log Task
                <PaperAirplaneIcon className="w-5" />
              </button>
            </div>
          </form>
        ) : (
          <button className="btn m-auto" onClick={start}>
            <PlayIcon className="mr-0.5 w-5" />
            Start new Task
          </button>
        )}
      </div>

      {failedToEndEntry && (
        <FailedToEndDialog
          entry={failedToEndEntry}
          onClose={closeFailedToEndDialog}
        />
      )}
    </div>
  );
}
