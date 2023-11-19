import { DateTime, Duration } from "luxon";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { AlertDialog } from "../../components/AlertDialog";
import { createEntry } from "../../store";

const inputDateStringToDateTime = (datetime_string: string) => {
  const [dateString, timeString] = datetime_string.split("T");
  const date = DateTime.fromFormat(dateString, "yyyy-MM-dd");
  const { hour, minute } = DateTime.fromFormat(timeString, "T");
  return date.plus(Duration.fromObject({ hour, minute }));
};

export function CreateEntryPage() {
  const navigate = useNavigate();

  type FormValues = {
    label: string;
    isBreak: boolean;
    start: string;
    end: string;
    keepCreatingEntries: boolean;
  };

  const {
    watch,
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm<FormValues>({});

  const [duration, setDuration] = useState<Duration | null>(null);

  useEffect(() => {
    const { unsubscribe } = watch((values) => {
      const start =
        values.start && inputDateStringToDateTime(values.start).toMillis();
      const end =
        values.end && inputDateStringToDateTime(values.end).toMillis();
      if (!end || !start) {
        setDuration(null);
      } else {
        setDuration(Duration.fromDurationLike(end - start));
      }
    });
    return unsubscribe;
  }, []);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<FormValues> = (newValues) => {
    try {
      if (!newValues.label) {
        throw new Error("Label missing");
      }
      if (!newValues.start) {
        throw new Error("Start missing");
      }
      if (!newValues.end) {
        throw new Error("End missing");
      }

      const converted_start: DateTime = inputDateStringToDateTime(
        newValues.start,
      );
      const converted_end: DateTime = inputDateStringToDateTime(newValues.end);

      // check that duration is over 1 and not negative
      const duration = converted_end.diff(converted_start);
      if (duration.toMillis() < 1000) {
        console.log("error: duration is negative or smaller than one second", {
          converted_start,
          converted_end,
          duration,
        });
        throw new Error(
          "error: duration is negative or smaller than one second",
        );
      }

      createEntry(
        newValues.label,
        converted_start.toMillis(),
        converted_end.toMillis(),
        !!newValues.isBreak,
      );

      if (newValues.keepCreatingEntries) {
        reset();
        setValue("keepCreatingEntries", true);
      } else {
        // go back to overview
        navigate(-1);
      }
    } catch (error: any) {
      if (error) {
        setSubmitError(error.message);
      }
      throw error;
    }
  };

  const registerLabel = register("label", { required: true });

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
          className={`grow pl-3 text-xl font-bold whitespace-nowrap text-ellipsis overflow-hidden`}
        >
          Create Entry
        </h1>
      </div>
      <hr />
      <form onSubmit={handleSubmit(onSubmit)} className="w-full p-2">
        <div className="flex items-center">
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
          <div className="pr-2">Start</div>
          <input
            type="datetime-local"
            {...register("start", { required: true })}
            className="input input-bordered max-w-xs"
          />
        </label>
        <p className="text-red-600">{errors.start?.message}</p>
        <br />
        <label className={`flex items-center`}>
          <div className="pr-2">End</div>
          <input
            type="datetime-local"
            {...register("end", { required: true })}
            className="input input-bordered max-w-xs"
          />
        </label>
        <p className="text-red-600">{errors.end?.message}</p>
        <br />
        {duration && (
          <div className={`flex items-center`}>
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
          <div className="grow pr-2">
            Is this entry a Break? (Breaks are not counted)
          </div>
          <input type="checkbox" {...register("isBreak")} />
        </label>
        <p className="text-red-600">{errors.isBreak?.message}</p>
        <p className="text-red-600">{errors.root?.message}</p>
        <br />
        <label className={`flex items-center`}>
          <div className="grow pr-2">
            Create another Entry after creating the current one?
          </div>
          <input type="checkbox" {...register("keepCreatingEntries")} />
        </label>
        <button className="btn w-full mt-1" role="submit" disabled={!isValid}>
          Create Entry
        </button>
        {submitError && (
          <AlertDialog
            onClose={() => setSubmitError(null)}
            title={"Error editing entry"}
            message={submitError}
          />
        )}
      </form>
    </div>
  );
}
