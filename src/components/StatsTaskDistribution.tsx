import { DateTime, Duration } from "luxon";
import { useStore } from "../store";

export function TaskDistributionPie() {
  const timeRange: [start: number, end: number] = [
    0,
    DateTime.now().toMillis(),
  ];

  const time_spent_by_label = useStore
    .getState()
    .getTimeSpendByLabel(...timeRange);

  const time_spent_total = time_spent_by_label.reduce(
    (p, c) => p + c.timeSpend.toMillis(),
    0
  );

  const rawLabels: {
    label: string;
    timeSpend: Duration;
    percentage: number;
  }[] = [];
  const threshold = 0.01;
  let time_for_other_label = 0;
  for (const label of time_spent_by_label) {
    const timeSpend = label.timeSpend.toMillis();
    const percentage = timeSpend / time_spent_total;
    if (percentage <= threshold) {
      time_for_other_label += timeSpend;
    } else {
      rawLabels.push({
        ...label,
        percentage,
      });
    }
  }
  rawLabels.sort((a, b) => b.percentage - a.percentage);

  let cursor = 0;
  const labelsSortedWithPercentage: {
    label: string;
    timeSpend: Duration;
    percentage: number;
    start: number;
    end: number;
  }[] = [];

  for (const label of rawLabels) {
    labelsSortedWithPercentage.push({
      ...label,
      start: cursor,
      end: (cursor = cursor + label.percentage),
    });
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
      <table className="charts-css pie max-w-md w-2/4">
        <tbody>
          {labelsSortedWithPercentage.map((label) => (
            <tr>
              <td
                key={btoa(label.label) + "-" + label.percentage}
                style={{ "--start": label.start, "--end": label.end }}
              >
                <span className="data"></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="charts-css legend legend-square mt-2">
        {labelsSortedWithPercentage.map((label) => (
          <li
            className="w-full flex"
            key={btoa(label.label) + "-" + label.percentage}
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
  );
}
