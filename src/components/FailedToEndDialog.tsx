import { Dialog } from "@headlessui/react";
import { Duration, DateTime } from "luxon";
import { useState, useRef, FormEventHandler } from "react";
import { endEntry, markEntryAsDeleted, TaskEntry } from "../store";
import { dateTimeToInputMinMax } from "../util";
import UpdatingDurationSince from "./UpdatingDurationSince";

const FailedToEndQuickDurations = [
  Duration.fromObject({ minutes: 3 }),
  Duration.fromObject({ minutes: 5 }),
  Duration.fromObject({ minutes: 10 }),
  Duration.fromObject({ minutes: 15 }),
];

export default function FailedToEndDialog({
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
