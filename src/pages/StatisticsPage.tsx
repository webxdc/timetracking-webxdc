import { Chart, ChartProps } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  TimeScale,
  Tooltip,
  Filler,
  BarController,
  BarElement,
} from "chart.js";
import "chartjs-adapter-luxon";

ChartJS.register(
  // BarController,
  // BarElement,
  // LineController,
  // LineElement,
  // PointElement,
  // LinearScale,
  // Title,
  // CategoryScale,
  TimeScale,
  Tooltip
  // Filler
);

import { MatrixController, MatrixElement } from "chartjs-chart-matrix";

ChartJS.register(MatrixController, MatrixElement);

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { DateTime, Duration } from "luxon";
import {
  getEntriesInTimeframeCutToIt,
  getEntriesTouchingTimeframe,
} from "../entryMaths";

export function StatisticsPage() {
  // const data = [
  //   { year: 2010, count: 10 },
  //   { year: 2011, count: 20 },
  //   { year: 2012, count: 15 },
  //   { year: 2013, count: 25 },
  //   { year: 2014, count: 22 },
  //   { year: 2015, count: 30 },
  //   { year: 2016, count: 28 },
  // ];

  return (
    <div>
      <h1>Stats</h1>

      <ActivityMap />
      {/* <Chart
        options={{ responsive: true }}
        type={"bar"}
        data={{
          labels: data.map((row) => row.year),
          datasets: [
            {
              // data: data.map((row) => row.count),
              borderSkipped: false,
              data: [
                { x: 6, y: 4 },
                { x: 6, y: 2 },
                { x: 2, y: 2 },
              ],
              borderRadius: 6,
            },
          ],
        }}
      /> */}
    </div>
  );
}

function ActivityMap() {
  type dataType = {
    x: string;
    y: string;
    d: string;
    v: number;
  };
  const [data, setData] = useState<dataType[] | null>(null);

  const entries = useStore((store) => store.getTrackedEntries());

  const [timeSpan] = useState([
    DateTime.now()
      .minus(Duration.fromObject({ year: 1 }))
      .toMillis(),
    DateTime.now().endOf("day").toMillis(),
  ]);
  console.log(entries.length);

  useEffect(() => {
    console.log(entries.length, timeSpan[0], timeSpan[1]);

    // idea for later: move work into webworker?
    setData(null);

    const dataEntries: dataType[] = [];
    let working_day = DateTime.fromMillis(timeSpan[0]);
    const end = DateTime.fromMillis(timeSpan[1]);
    // this is for improving performance a little bit
    const entries_in_span = getEntriesTouchingTimeframe(
      entries,
      working_day.toMillis(),
      end.toMillis()
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
        endOfDay.toMillis()
      );
      const timeSpentThatDay = dayEntries
        .map((e) => e.duration || 0)
        .reduce((previous, current) => previous + current, 0);

      dataEntries.push({
        x: startOfDay.toISODate() || "",
        y: String(startOfDay.weekday),
        v: Math.floor(timeSpentThatDay / 60000), // convert to minutes per day
        d: startOfDay.toISODate() || "",
      });

      working_day = working_day.plus({ days: 1 });
    }
    console.log(dataEntries);

    setData(dataEntries);
  }, [`${entries.length}`, timeSpan[0], timeSpan[1]]);

  const { options, chartData } = useMemo(() => {
    const scales: any = {
      y: {
        type: "time",
        offset: true,
        time: {
          unit: "day",
          round: "day",
          isoWeekday: 1,
          parser: "E",
          displayFormats: {
            day: "EEE",
          },
        },
        reverse: true,
        position: "right",
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          padding: 1,
          font: {
            size: 9,
          },
        },
        grid: {
          display: false,
          drawBorder: false,
          tickLength: 0,
        },
      },
      x: {
        type: "time",
        position: "bottom",
        offset: true,
        time: {
          unit: "week",
          round: "week",
          isoWeekday: 1,
          displayFormats: {
            week: "MMM dd",
          },
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          font: {
            size: 9,
          },
        },
        grid: {
          display: false,
          drawBorder: false,
          tickLength: 0,
        },
      },
    };
    const options: ChartProps<
      "matrix",
      { x: string; y: string; d: string; v: number }[],
      unknown
    >["options"] = {
      responsive: true,
      aspectRatio: 5,
      plugins: {
        legend: undefined,
        tooltip: {
          displayColors: false,
          callbacks: {
            title(items) {
              const context = items[0];
              if (context) {
                return (
                  context.dataset.data[context.dataIndex] as any as dataType
                ).d;
              }
            },
            label(context) {
              const { v } = context.dataset.data[
                context.dataIndex
              ] as any as dataType;
              return Duration.fromObject({ minutes: v })
                .shiftTo("hours", "minutes")
                .toHuman();
            },
          },
        },
      },
      scales: scales,
      layout: {
        padding: {
          top: 10,
        },
      },
    };

    const maxFeasableMinutesPerDay = 60 * 8;
    // const maxPossibleMinutesPerDay = 60 * 24;

    const chartData: ChartProps<
      "matrix",
      { x: string; y: string; d: string; v: number }[],
      unknown
    >["data"] = {
      datasets: [
        {
          data: data || [],
          backgroundColor(c) {
            const minutes = (c.dataset.data[c.dataIndex] as any as dataType).v;
            const alpha = minutes / maxFeasableMinutesPerDay;
            let green = 255;
            if (alpha > 1) {
              green = 255 - 255 * (alpha - 1);
            }
            return `rgba(0,${green},200, ${alpha})`;
          },
          borderColor(c) {
            const minutes = (c.dataset.data[c.dataIndex] as any as dataType).v;
            const alpha = minutes / maxFeasableMinutesPerDay;
            let green = 255;
            if (alpha > 1) {
              green = 255 - 255 * (alpha - 1);
            }
            return `rgba(0,${green},200, ${alpha})`;
          },
          borderWidth: 1,
          hoverBackgroundColor: "lightblue",
          hoverBorderColor: "blue",
          width(c) {
            const a = c.chart.chartArea || {};
            return (a.right - a.left) / 53 - 1;
          },
          height(c) {
            const a = c.chart.chartArea || {};
            return (a.bottom - a.top) / 7 - 1;
          },
        },
      ],
    };

    return { options, chartData };
  }, [data]);

  return (
    <div>
      {data === null && <div>Loading Data...</div>}
      {data !== null && (
        <Chart options={options} type={"matrix"} data={chartData} />
      )}
    </div>
  );
}
