import { useVirtualizer } from "@tanstack/react-virtual";
import { DateTime } from "luxon";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  minMonthViewHeight,
  MonthView,
} from "../../components/StatsMonthViewDays";
import { useStore } from "../../store";
import { arrayMin } from "../../util";

/** cap it at a 100years so it does not completely freeze in case of failure */
const maxMonths = 1200;

export function DaysInMonthsPage() {
  // get oldest entry
  const oldest_entry_start = useStore((store) =>
    arrayMin(store.getTrackedEntries().map((t) => t.start)),
  );

  const { months } = useMemo(() => {
    const startTime =
      oldest_entry_start || DateTime.now().minus({ month: 1 }).toMillis();
    const now = DateTime.now().endOf("month");
    const backThen = DateTime.fromMillis(startTime);
    let pointer = backThen;
    let months: { year: number; month: number; key: string }[] = [];
    let i = 0;
    while (pointer.toMillis() < now.toMillis()) {
      i++;
      if (i > maxMonths) {
        break;
      }
      months.push({
        year: pointer.year,
        month: pointer.month,
        key: String(pointer.toMillis()),
      });
      pointer = pointer.plus({ month: 1 });
      // console.log(pointer.diff(now).months);
    }
    months.reverse();
    return { months };
  }, [oldest_entry_start]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: months.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => minMonthViewHeight,
    overscan: 5,
    getItemKey: (index) => months[index].key,
  });

  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <button className="w-full p-2 text-start" onClick={() => navigate(-1)}>
        &lt; Back
      </button>
      <hr />
      <div ref={parentRef} className="flex-grow overflow-y-scroll">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
            overscrollBehaviorX: "none",
            overflowX: "hidden",
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
              <MonthView
                year={months[virtualRow.index].year}
                month={months[virtualRow.index].month}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
