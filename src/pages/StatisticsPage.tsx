import { useEffect, useRef, useState } from "react";
import { DateTime, Duration } from "luxon";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import {
  getEntriesInTimeframeCutToIt,
  getEntriesTouchingTimeframe,
} from "../entryMaths";
import { WeekView } from "../components/StatsWeekView";
import { QuickStats } from "../components/TrackPageStats";
import { MonthView } from "../components/StatsMonthViewDays";
import { TaskDistributionPie } from "../components/StatsTaskDistribution";
import { ContributionCalendar } from "react-contribution-calendar";
import { useIsDarkTheme } from "../util";

export function StatisticsPage() {
  const now = DateTime.now();
  const currentYear = now.year;
  const currentWeek = now.weekNumber;
  const currentMonth = now.month;
  const navigate = useNavigate();

  const [timePerDayMode, setTimePerDayMode] = useState<"week" | "month">(
    "week",
  );

  const timePerDayModeOptions: {
    label: string;
    value: typeof timePerDayMode;
  }[] = [
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
  ];

  type TimeRange = [start: number, end: number];
  const [pieTimeRangeIndex, setPieTimeRangeIndex] = useState<number>(0);
  const pieTimeRangeOptions: {
    label: string;
    value: TimeRange;
    threshold?: number;
  }[] = [
    {
      label: "This Week",
      value: [now.startOf("week").toMillis(), now.toMillis()],
      threshold: 0.01,
    },
    {
      label: "Last Week",
      value: [
        now.startOf("week").minus({ week: 1 }).toMillis(),
        now.startOf("week").toMillis(),
      ],
    },
    {
      label: "This Month",
      value: [now.startOf("month").toMillis(), now.toMillis()],
    },
    {
      label: "This Year",
      value: [now.startOf("year").toMillis(), now.toMillis()],
    },
    // { label: "Everything", value: [0, now.toMillis()] },
  ];

  return (
    <div className="flex flex-col">
      <h1 className="p-1 text-center text-lg font-medium">Stats</h1>
      <hr />
      <div className="self-center">
        <QuickStats />
      </div>
      <hr />
      <div className="mx-2 mt-2 flex items-center">
        <h2 className="text-lg font-medium">Time Per Day</h2>
        <div className="flex-grow"></div>
        <div className="latest-tasks-timerange flex">
          {timePerDayModeOptions.map((mode, index, array) => {
            let border =
              array.length - 1 === index
                ? "rounded-r-lg border-l-0"
                : index === 0
                ? "rounded-l-lg border-r-0"
                : "border-x-0";

            let active =
              timePerDayMode === mode.value
                ? "bg-slate-600 hover:bg-slate-600 text-white"
                : "";

            return (
              <button
                key={index}
                onClick={() => setTimePerDayMode(mode.value)}
                className={`pv-2 border-collapse border-2 border-solid border-slate-300 px-2 py-1 font-medium hover:bg-slate-500 hover:text-white ${border} ${active}`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>
      {timePerDayMode === "week" && (
        <>
          <WeekView year={currentYear} week_number={currentWeek} />
          <WeekView year={currentYear} week_number={currentWeek - 1} />
        </>
      )}
      {timePerDayMode === "month" && (
        <MonthView year={currentYear} month={currentMonth} />
      )}
      <div className="m-1">
        <hr />
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("/stats/weeks")}
        >
          View All Weeks &gt;
        </button>
        <hr />
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("/stats/months")}
        >
          View All Months &gt;
        </button>
        <hr />
      </div>
      <div className="divider">Heatmap</div>
      <ActivityMap />
      <div className="divider">Time spend by Task</div>

      <div className="my-2 flex w-full justify-center">
        <div className="latest-tasks-timerange flex">
          {pieTimeRangeOptions.map((mode, index, array) => {
            let border =
              array.length - 1 === index
                ? "rounded-r-lg border-l-0"
                : index === 0
                ? "rounded-l-lg border-r-0"
                : "border-x-0";

            let active =
              pieTimeRangeIndex === index
                ? "bg-slate-600 hover:bg-slate-600 text-white"
                : "";

            return (
              <button
                key={index}
                onClick={() => setPieTimeRangeIndex(index)}
                className={`pv-2 border-collapse border-2 border-solid border-slate-300 px-2 py-1 font-medium hover:bg-slate-500 hover:text-white ${border} ${active}`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>
      <TaskDistributionPie
        timeRange={pieTimeRangeOptions[pieTimeRangeIndex].value}
        threshold={pieTimeRangeOptions[pieTimeRangeIndex].threshold}
      />
    </div>
  );
}

const maxFeasableMinutesPerDay = 60 * 8;
// const maxPossibleMinutesPerDay = 60 * 24;

const day_size = 12;
const free_space = 70; // space for other stuff

function ActivityMap() {
  const isDarkTheme = useIsDarkTheme();
  type dataType2 = {
    [date: string]: {
      level: number;
      data: {
        // this is not a lib feature yet
        custom_tooltip: string;
      };
    };
  };
  const [data2, setData2] = useState<dataType2[] | null>(null);

  const entries = useStore((store) => store.getTrackedEntries());

  const [timeSpan, setTimeSpan] = useState([
    DateTime.now().minus(Duration.fromObject({ year: 1 })),
    DateTime.now().endOf("day"),
  ]);

  useEffect(() => {
    // idea for later: move work into webworker?
    setData2(null);

    const data2Entries: dataType2[] = [];
    let working_day = timeSpan[0];
    const end = timeSpan[1];
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

      const minutes = Math.floor(timeSpentThatDay / 60000); // convert to minutes per day

      const level = Math.min(
        Math.max(Math.floor((minutes / maxFeasableMinutesPerDay) * 4), 0),
        4,
      );

      data2Entries.push({
        [startOfDay.toFormat("yyyy-MM-dd")]: {
          level,
          data: {
            custom_tooltip:
              startOfDay.toFormat("yyyy-MM-dd") +
              "\n" +
              Duration.fromObject({ minutes })
                .shiftTo("hours", "minutes")
                .toHuman(),
          },
        },
      });

      working_day = working_day.plus({ days: 1 });
    }
    // console.log(dataEntries);

    setData2(data2Entries);
  }, [`${entries.length}`, timeSpan[0], timeSpan[1]]);

  const container = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (container.current) {
        const availableWidth =
          container.current.getBoundingClientRect().width - 30;
        const weeks = Math.floor(
          Math.max((availableWidth || 0) - free_space, 0) / day_size,
        );
        setTimeSpan([DateTime.now().minus({ weeks }), DateTime.now()]);
        setAvailableWidth(availableWidth);
      }
    };
    if (container.current) {
      update();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [container.current]);

  const start = timeSpan[0].toFormat("yyyy-MM-dd");
  const end = timeSpan[1].toFormat("yyyy-MM-dd");

  const theme = isDarkTheme ? "dark_winter" : "winter";

  return (
    <div>
      {data2 === null && <div>Loading Data...</div>}
      <div className="w-full py-4" ref={container}>
        {availableWidth && data2 !== null && (
          <div className="contribution-calendar">
            <ContributionCalendar
              data={data2}
              start={start}
              end={end}
              daysOfTheWeek={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
              textColor="grey"
              startsOnSunday={true}
              includeBoundary={false}
              theme={theme}
              cx={day_size}
              cy={day_size}
              cr={1}
              onCellClick={(e, data) => console.log(data)}
              scroll={false}
              style={{}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
