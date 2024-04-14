import { Duration } from "luxon";
import { useStore } from "../store";

export function TaskDistributionPie({
  timeRange,
  threshold,
}: {
  timeRange: [start: number, end: number];
  /** whats the minimum percentage a task need to be included in the list  */
  threshold?: number;
}) {
  const time_spent_by_label = useStore
    .getState()
    .getTimeSpendByLabel(...timeRange);

  const time_spent_total = time_spent_by_label.reduce(
    (p, c) => p + c.timeSpend.toMillis(),
    0,
  );

  const rawLabels: {
    label: string;
    timeSpend: Duration;
    percentage: number;
  }[] = [];
  /** how many entries get incuded until they are grouped into "Other" */
  const maxEntries = 9;
  const realThreshold = threshold || 0.01;
  let time_for_other_label = 0;
  for (const label of time_spent_by_label) {
    const timeSpend = label.timeSpend.toMillis();
    const percentage = timeSpend / time_spent_total;
    if (percentage <= realThreshold) {
      time_for_other_label += timeSpend;
    } else {
      rawLabels.push({
        ...label,
        percentage,
      });
    }
  }

  rawLabels.sort((a, b) => b.percentage - a.percentage);

  const labelsSortedWithPercentage: {
    label: string;
    timeSpend: Duration;
    percentage: number;
    start: number;
    end: number;
  }[] = [];

  let cursor = 0;
  let i = 0;
  for (const label of rawLabels) {
    if (i >= maxEntries) {
      time_for_other_label += label.timeSpend.toMillis();
      continue;
    }
    labelsSortedWithPercentage.push({
      ...label,
      start: cursor,
      end: (cursor = cursor + label.percentage),
    });
    i++;
  }

  if (time_for_other_label !== 0) {
    labelsSortedWithPercentage.push({
      label: "Other Tasks",
      percentage: time_for_other_label / time_spent_total,
      timeSpend: Duration.fromMillis(time_for_other_label),
      start: cursor,
      end: 1,
    });
  }

  return (
    <div>
      <table className="charts-css pie max-w-xs md:max-w-md w-2/4">
        <tbody>
          {labelsSortedWithPercentage.map((label) => (
            <tr>
              <td
                key={label.label + "-" + label.percentage}
                style={{ "--start": label.start, "--end": label.end }}
              >
                <span className="data"></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mx-2 mt-2">
        <ul className="charts-css legend legend-square">
          {labelsSortedWithPercentage.map((label) => (
            <li
              className="w-full flex"
              key={label.label + "-" + label.percentage}
            >
              <span className="flex-grow">
                {label.label}: (
                {label.timeSpend
                  .shiftTo("hours", "minutes", "milliseconds")
                  .set({ milliseconds: 0 })
                  .shiftTo("hours", "minutes")
                  .toHuman({ unitDisplay: "short" })}
                )
              </span>

              <span className="float-right">
                {Math.round(label.percentage * 10000) / 100}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
