import { DateTime, Duration } from "luxon";
import { useState, useEffect } from "react";
import {
  getEntriesTouchingTimeframe,
  getEntriesInTimeframeCutToIt,
} from "../entryMaths";
import { useStore } from "../store";

export const minWeekViewHeight = 246;

export function WeekView({
  year,
  week_number,
}: {
  year: number;
  week_number: number;
}) {
  type DataEntry = {
    day_name: string;
    total_minutes: number;
  };
  const [data, setData] = useState<DataEntry[] | null>(null);
  const [total, setTotal] = useState<Duration>(Duration.fromMillis(0));
  const entries = useStore((store) => store.getTrackedEntries());

  const [timeSpan] = useState([
    DateTime.fromObject({ weekYear: year, weekNumber: week_number })
      .startOf("day")
      .toMillis(),
    DateTime.fromObject({ weekYear: year, weekNumber: week_number })
      .plus(Duration.fromObject({ week: 1 }))
      .endOf("day")
      .toMillis(),
  ]);
  // console.log(entries.length);

  useEffect(() => {
    console.log(entries.length, timeSpan[0], timeSpan[1]);

    // idea for later: move work into webworker?
    setData(null);

    const dataEntries: DataEntry[] = [];
    let working_day = DateTime.fromMillis(timeSpan[0]);
    const end = DateTime.fromMillis(timeSpan[1]);
    // this is for improving performance a little bit
    const entries_in_span = getEntriesTouchingTimeframe(
      entries,
      working_day.toMillis(),
      end.toMillis(),
    );

    // remove all running entries because they would make the stats useless
    // idea maybe show the last open entry somewhere?
    const entries_in_span_cleaned = entries_in_span.filter(({ end }) => !!end);

    while (working_day.diff(end, ["days"]).days < 0) {
      const startOfDay = working_day.startOf("day");
      const endOfDay = working_day.endOf("day");
      const dayEntries = getEntriesInTimeframeCutToIt(
        entries_in_span_cleaned,
        startOfDay.toMillis(),
        endOfDay.toMillis(),
      );
      const timeSpentThatDay = dayEntries
        .map((e) => e.duration || 0)
        .reduce((previous, current) => previous + current, 0);

      dataEntries.push({
        day_name: startOfDay.weekdayLong || String(startOfDay.weekday),
        total_minutes: Math.floor(timeSpentThatDay / 60000), // convert to minutes per day
      });

      working_day = working_day.plus({ days: 1 });
    }
    console.log(dataEntries);

    // workaround remove last entry if it's over one week
    if (dataEntries.length > 7) {
      dataEntries.pop();
    }

    setData(dataEntries);
    const total_minutes = dataEntries.reduce((p, c) => p + c.total_minutes, 0);
    setTotal(
      Duration.fromObject({ minutes: total_minutes }).shiftTo(
        "hours",
        "minutes",
      ),
    );
  }, [`${entries.length}`, timeSpan[0], timeSpan[1]]);

  const now = DateTime.now();
  const isCurrentWeek = now.weekNumber === week_number && now.year === year;
  const caption = `${year} Week ${week_number} ${
    isCurrentWeek ? " (This Week)" : ""
  }`;

  const maxFeasibleMinutesPerDay = 14 * 60;

  const max_label_length =
    data
      ?.map(({ day_name }) => day_name.length)
      .sort()
      .reverse()[0] || 40;
  const letterWidth = 12;

  return (
    <div className="m-2" style={{ minHeight: minWeekViewHeight }}>
      <table
        className="weekdays-chart charts-css bar show-heading show-labels labels-align-start data-spacing-1 datasets-spacing-2"
        style={{ "--labels-size": `${max_label_length * letterWidth}px` }}
      >
        <caption>{caption}</caption>

        <thead>
          <tr>
            <th scope="col"> Weekday </th>
            <th scope="col"> Hours </th>
          </tr>
        </thead>

        <tbody>
          {data?.map(({ day_name, total_minutes }, i) => {
            const size = Math.min(1, total_minutes / maxFeasibleMinutesPerDay);

            return (
              <tr key={day_name + i}>
                <th scope="row"> {day_name} </th>
                <td
                  style={{
                    "--size": size,
                  }}
                >
                  <span
                    className={`data ${size < 0.5 ? "outside" : "inside"} p-1`}
                  >
                    {Duration.fromObject({ minutes: total_minutes })
                      .shiftTo("hours", "minutes")
                      .toHuman({ unitDisplay: "short" })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex w-full justify-end">
        <div className="self-end">
          Total: {total.toHuman({ unitDisplay: "long" })}
        </div>
      </div>
    </div>
  );
}
