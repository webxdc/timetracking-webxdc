import { Duration, DateTime, Interval } from "luxon";
import { useState, useEffect } from "react";

export default function UpdatingDurationSince({
  startTS,
  additionalDuration,
}: {
  startTS: number;
  additionalDuration?: Duration;
}) {
  const [text, setText] = useState("??:??:??");

  useEffect(() => {
    const start = DateTime.fromMillis(startTS);
    const update = () => {
      let duration = Interval.fromDateTimes(start, DateTime.now()).toDuration();
      if (additionalDuration) {
        duration = duration.plus(additionalDuration);
      }
      setText(duration.toFormat("hh:mm:ss"));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTS, additionalDuration]);

  return <>{text}</>;
}

export function FormatedDuration({ duration }: { duration: Duration }) {
  return <>{duration.toFormat("hh:mm:ss")}</>;
}
