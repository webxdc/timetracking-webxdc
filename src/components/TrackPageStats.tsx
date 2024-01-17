import { DateTime, Duration } from "luxon";
import { useEffect, useState } from "react";
import {
  getEntriesInTimeframeCutToIt,
  getEntriesTouchingTimeframe,
} from "../entryMaths";
import { TaskEntry, useStore } from "../store";

const durationFromCappedEntries = (entries: TaskEntry[]): Duration => {
  const duration = entries
    .map(({ duration }) => duration || 0)
    .reduce((pV, cV) => pV + cV, 0);
  // console.log(entries, duration);
  return Duration.fromMillis(duration);
};

export function QuickStats() {
  type Stats = {
    today: Duration;
    yesterday: Duration;
    this_week: Duration;
    last_week: Duration;
    this_month: Duration;
    last_month: Duration;
  };

  const entries = useStore((s) => s.getTrackedEntries());

  const [stats, setStats] = useState<Stats>();
  useEffect(() => {
    // Last 2 months
    const now = DateTime.now();
    const working_data = getEntriesTouchingTimeframe(
      entries,
      now.startOf("month").minus({ month: 1 }).toMillis(),
      now.toMillis(),
    );
    const last_week = durationFromCappedEntries(
      getEntriesInTimeframeCutToIt(
        working_data,
        now.startOf("week").minus({ week: 1 }).toMillis(),
        now.startOf("week").toMillis(),
      ),
    ).shiftTo("hours", "minute");

    const start_of_last_month = now.startOf("month").minus({ month: 1 });
    const last_month = durationFromCappedEntries(
      getEntriesInTimeframeCutToIt(
        working_data,
        start_of_last_month.toMillis(),
        start_of_last_month.endOf("month").toMillis(),
      ),
    ).shiftTo("hours", "minute");

    const update = () => {
      const now = DateTime.now();
      const today = durationFromCappedEntries(
        getEntriesInTimeframeCutToIt(
          working_data,
          now.startOf("day").toMillis(),
          now.toMillis(),
        ),
      ).shiftTo("hours", "minute");
      const yesterday = durationFromCappedEntries(
        getEntriesInTimeframeCutToIt(
          working_data,
          now.startOf("day").minus({ day: 1 }).toMillis(),
          now.startOf("day").toMillis(),
        ),
      ).shiftTo("hours", "minute");
      const this_week = durationFromCappedEntries(
        getEntriesInTimeframeCutToIt(
          working_data,
          now.startOf("week").toMillis(),
          now.toMillis(),
        ),
      ).shiftTo("hours", "minute");
      const this_month = durationFromCappedEntries(
        getEntriesInTimeframeCutToIt(
          working_data,
          now.startOf("month").toMillis(),
          now.toMillis(),
        ),
      ).shiftTo("hours", "minute");

      setStats({
        today,
        yesterday,
        this_week,
        this_month,
        last_month,
        last_week,
      });
    };

    update();

    const interval = setInterval(update, 30_000); // update every half minute
    return () => clearInterval(interval);
  }, [entries]); // update when entries change

  return (
    <div className="stats shadow">
      {stats && (
        <>
          <div className="stat">
            <div className="stat-title">Today</div>
            <div className="stat-value">
              {durationToDisplay(stats.today) || "0m"}
            </div>
            <div className="stat-desc">
              Yesterday: {durationToDisplay(stats.yesterday) || "-"}
            </div>
          </div>

          <div className="stat">
            <div className="stat-title">This Week</div>
            <div className="stat-value">
              {durationToDisplay(stats.this_week) || "0m"}
            </div>
            <div className="stat-desc">
              Last Week: {durationToDisplay(stats.last_week) || "-"}
            </div>
          </div>

          <div className="stat">
            <div className="stat-title">This Month</div>
            <div className="stat-value">
              {durationToDisplay(stats.this_month) || "0m"}
            </div>
            <div className="stat-desc">
              Last Month: {durationToDisplay(stats.last_month) || "-"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** converts duration to string for display
 * duration should be shifted to hour and minutes before passing to this function */
function durationToDisplay(duration: Duration): string {
  let out = "";
  if (duration.hours) {
    out += `${Math.floor(duration.hours)}h `;
  }
  if (duration.minutes) {
    out += `${Math.floor(duration.minutes)}m`;
  }
  return out;
}
