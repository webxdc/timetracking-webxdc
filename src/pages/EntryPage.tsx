import { DateTime, Duration } from "luxon";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { AlertDialog } from "../components/AlertDialog";
import { editEntry, markEntryAsDeleted, TaskEntry, useStore } from "../store";

const dateTimeToInputDateString = (time: DateTime) => {
  return `${time.toFormat("yyyy-MM-dd")}T${time.toFormat("T")}`;
};

const inputDateStringToDateTime = (datetime_string: string) => {
  const [dateString, timeString] = datetime_string.split("T");
  const date = DateTime.fromFormat(dateString, "yyyy-MM-dd");
  const { hour, minute } = DateTime.fromFormat(timeString, "T");
  return date.plus(Duration.fromObject({ hour, minute }));
};

export function EntryPage() {
  let { id } = useParams();
  const navigate = useNavigate();

  const { entry, history } = useStore((store) => ({
    entry: store.entries.find((e) => e.id === id),
    history: store.actionHistory.filter((h) => h.id === id),
  }));

  if (!entry) {
    console.log("entry not found, id:", id, entry);
    // go back if not found
    navigate(-1);
    return null;
  }

  const [formKey, setFormKey] = useState(0);

  return (
    <div className="absolute top-0 flex h-full w-full flex-col">
      <div className="flex items-center py-1">
        <button
          className="p-2 text-start shrink-0"
          onClick={() => navigate(-1)}
        >
          &lt; Back
        </button>
        <h1
          className={`grow pl-3 text-xl font-bold ${
            entry.deleted ? "text-red-700 line-through" : ""
          } whitespace-nowrap text-ellipsis overflow-hidden`}
        >
          {entry.label}
        </h1>
        <button
          className="px-2 text-red-600 hover:text-red-800"
          onClick={() => {
            markEntryAsDeleted(entry.id);
          }}
          disabled={entry.deleted}
        >
          Delete
        </button>
      </div>
      <hr />

      <div className="relative m-2 flex flex-grow flex-col overflow-y-scroll">
        <EntryEditForm
          entry={entry}
          key={formKey}
          onSubmit={() => {
            // make the form reset with new values so it it no longer dirty.
            setFormKey((old) => old + 1);
          }}
        />
        <div className="divider">History</div>
        <div className="overflow-y-scroll">
          <ul>
            {history.map((historyItem) => (
              <li>
                {DateTime.fromMillis(historyItem.when).toLocaleString(
                  DateTime.DATETIME_SHORT,
                )}{" "}
                [{historyItem.who}]: {historyItem.what}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EntryEditForm({
  entry,
  onSubmit: onSubmitDone,
}: {
  entry: TaskEntry;
  onSubmit: () => void;
}) {
  type FormValues = {
    label: string;
    isBreak: boolean;
    start: string;
    end: string | undefined;
  };

  const {
    watch,
    register,
    handleSubmit,
    formState: { isDirty, dirtyFields, errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      label: entry.label,
      // convert undefined to false so the isDirty check works when users revert their changes
      isBreak: !!entry.is_break,
      start: dateTimeToInputDateString(DateTime.fromMillis(entry.start)),
      end: entry.end
        ? dateTimeToInputDateString(DateTime.fromMillis(entry.end))
        : undefined,
    },
  });

  const [duration, setDuration] = useState<Duration | null>(null);

  useEffect(() => {
    entry.duration && setDuration(Duration.fromDurationLike(entry.duration));
    const { unsubscribe } = watch((values) => {
      const start =
        (values.start && inputDateStringToDateTime(values.start).toMillis()) ||
        entry.start;
      const end =
        (values.end && inputDateStringToDateTime(values.end).toMillis()) ||
        entry.end;
      if (!end) {
        setDuration(null);
      } else {
        setDuration(Duration.fromDurationLike(end - start));
      }
    });
    return unsubscribe;
  }, [entry.duration, entry.start, entry.end]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<FormValues> = (newValues) => {
    try {
      if (!entry) {
        throw new Error("entry is undefined, this should not happen");
      }
      const updated_properties: Parameters<typeof editEntry>[1] = {};
      if (entry.label !== newValues.label) {
        updated_properties.new_label = newValues.label;
      }
      if (entry.is_break !== newValues.isBreak) {
        updated_properties.new_is_break = newValues.isBreak
          ? true
          : typeof entry.is_break !== "undefined"
          ? false
          : undefined;
      }
      if (newValues.start) {
        if (
          dateTimeToInputDateString(DateTime.fromMillis(entry.start)) !=
          newValues.start
        ) {
          const converted_start: DateTime = inputDateStringToDateTime(
            newValues.start,
          );
          updated_properties.new_start = converted_start.toMillis();
        }
      }
      if (newValues.end) {
        if (
          dateTimeToInputDateString(DateTime.fromMillis(entry.end || 0)) !=
          newValues.end
        ) {
          const converted_end: DateTime = inputDateStringToDateTime(
            newValues.end,
          );
          updated_properties.new_end = converted_end.toMillis();
        }
      }

      if (entry.end || newValues.end) {
        // todo check that duration is over 1 and not negative
        const start = DateTime.fromMillis(
          updated_properties.new_start || entry.start,
        );
        const end = DateTime.fromMillis(
          updated_properties.new_end || (entry.end as number),
        );
        const duration = end.diff(start);
        if (duration.toMillis() < 1000) {
          console.log(
            "error: duration is negative or smaller than one second",
            {
              start,
              end,
              duration,
            },
          );
          throw new Error(
            "error: duration is negative or smaller than one second",
          );
          // todo show error to user (maybe form has fancy validation errors?)
        }
      }
      if (Object.keys(updated_properties).length !== 0) {
        editEntry(entry.id, updated_properties).then(onSubmitDone);

        // selectEntry.bind(null, null) // go back to overview
      }
    } catch (error: any) {
      if (error) {
        setSubmitError(error.message);
      }
      throw error;
    }
  };

  const registerLabel = register("label");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="flex items-center">
        <div
          className={`edit-entry-dirty ${
            dirtyFields.label ? "visible" : "invisible"
          }`}
        />
        <label className={`pr-2`} htmlFor={registerLabel.name}>
          Label
        </label>
        <input
          type="text"
          {...registerLabel}
          className="input input-bordered grow"
          minLength={2}
        />
      </div>
      <p className="text-red-600">{errors.label?.message}</p>
      <br />
      <label className={`flex items-center`}>
        <div
          className={`edit-entry-dirty ${
            dirtyFields.start ? "visible" : "invisible"
          }`}
        />
        <div className="pr-2">Start</div>
        <input
          type="datetime-local"
          {...register("start")}
          className="input input-bordered max-w-xs"
        />
      </label>
      <p className="text-red-600">{errors.start?.message}</p>
      <br />
      <label className={`flex items-center`}>
        <div
          className={`edit-entry-dirty ${
            dirtyFields.end ? "visible" : "invisible"
          }`}
        />
        <div className="pr-2">End</div>
        <input
          type="datetime-local"
          {...register("end")}
          className="input input-bordered max-w-xs"
        />
      </label>
      <p className="text-red-600">{errors.end?.message}</p>
      <br />
      {duration && (
        <div className={`flex items-center`}>
          <div
            className={`edit-entry-dirty ${
              dirtyFields.start || dirtyFields.end ? "visible" : "invisible"
            }`}
          />
          Duration:{" "}
          {duration.shiftTo("hours", "minutes", "seconds").toHuman({
            maximumFractionDigits: 0,
            listStyle: "narrow",
            unitDisplay: "short",
          })}
        </div>
      )}
      <br />
      <label className={`flex items-center`}>
        <div
          className={`edit-entry-dirty ${
            dirtyFields.isBreak ? "visible" : "invisible"
          }`}
        />
        <div className="grow pr-2">Break (not counted)</div>
        <input type="checkbox" {...register("isBreak")} />
      </label>
      <p className="text-red-600">{errors.isBreak?.message}</p>
      <p className="text-red-600">{errors.root?.message}</p>
      <button className="btn" disabled={!isDirty} role="submit">
        Save Changes
      </button>
      {submitError && (
        <AlertDialog
          onClose={() => setSubmitError(null)}
          title={"Error editing entry"}
          message={submitError}
        />
      )}
    </form>
  );
}
