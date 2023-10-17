import { useVirtualizer } from "@tanstack/react-virtual";
import { DateTime } from "luxon";
import { useContext, useMemo, useRef } from "react";
import { NavigationContext } from "../../App";
import { WeekView } from "../../components/StatsWeekView";
import { useStore } from "../../store";
import { arrayMin } from "../../util";

/** cap it at a 100years so it does not completely freeze in case of failure */
const maxWeeks = 5100;

export function DaysInWeeksPage() {
  // get oldest week
  const oldest_entry_start = useStore((store) =>
    arrayMin(store.getTrackedEntries().map((t) => t.start))
  );

  const { weeks } = useMemo(() => {
    const startTime =
      oldest_entry_start || DateTime.now().minus({ weeks: 1 }).toMillis();
    const now = DateTime.now().endOf("week");
    const backThen = DateTime.fromMillis(startTime);
    let pointer = backThen;
    let weeks: { year: number; weekNumber: number; key: string }[] = [];
    let i = 0;
    while (pointer.toMillis() < now.toMillis()) {
      i++;
      if (i > maxWeeks) {
        break;
      }
      weeks.push({
        year: pointer.year,
        weekNumber: pointer.weekNumber,
        key: String(pointer.toMillis()),
      });
      pointer = pointer.plus({ weeks: 1 });
      // console.log(pointer.diff(now).weeks);
    }
    weeks.reverse();
    return { weeks };
  }, [oldest_entry_start]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: weeks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 246,
    overscan: 5,
    getItemKey: (index) => weeks[index].key,
  });

  const { navigate } = useContext(NavigationContext);

  return (
    <div className="flex h-full flex-col">
      <button
        className="w-full p-2 text-start"
        onClick={() => navigate("stats")}
      >
        &lt; Back To Statistics Overview
      </button>
      <hr />
      <div ref={parentRef} className="flex-grow overflow-y-scroll">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className={
                virtualRow.index % 2
                  ? " bg-slate-100 dark:bg-slate-800"
                  : " bg-slate-200 dark:bg-slate-900"
              }
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <WeekView
                year={weeks[virtualRow.index].year}
                week_number={weeks[virtualRow.index].weekNumber}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
