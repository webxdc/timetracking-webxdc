import { DateTime, Duration } from "luxon";
import { importEntries, TaskEntry } from "./store";

type SimonsBotFormatEntry = {
  /** date in DD.MM.YY example "01.03.23" */
  day: string;
  /** duration in minutes */
  duration: number | "?";
  /** start time `HH:MM dayname` example: "14:03 Wed" */
  start: string;
  /** end time `HH:MM dayname` example: "14:29 Fri" or "?" */
  end: string | "?";
  /** the label */
  label: string;
};
namespace simons_bot_format {
  function parseDay(day: SimonsBotFormatEntry["day"]): DateTime {
    if (day.length !== 8) {
      throw new Error("wrong day format");
    }
    const [dd, mm, yy] = day.split(".");
    return DateTime.fromObject({
      day: Number(dd),
      month: Number(mm),
      year: 2000 + Number(yy),
    });
  }

  function parse_time(time_and_weekday: string) {
    const [time, weekday] = time_and_weekday.split(" ");
    if (time.length !== 4 && time.length !== 5) {
      console.log("wrong time format:", { time_and_weekday, time });
      throw new Error("wrong time format");
    }
    const [hour, minute] = time.split(":");
    return {
      hour: Number(hour),
      minute: Number(minute),
      weekday,
    };
  }

  export function parseStartDate(
    day: SimonsBotFormatEntry["day"],
    start: string,
  ) {
    const date: DateTime = parseDay(day);
    const { hour, minute, weekday } = parse_time(start);
    // check if weekday is correct
    const expected_weekday = date.setLocale("en").weekdayShort;
    if (expected_weekday !== weekday) {
      console.log("weekday in start and day are different", {
        weekday,
        expected_weekday,
      });
      throw new Error("weekday in start and day are different");
    }
    // set time
    return date.set({ hour, minute });
  }

  function weekdayShortToNumber(weekday: string) {
    return {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    }[weekday];
  }

  export function parseEndDate(day: SimonsBotFormatEntry["day"], end: string) {
    if (end === "?") {
      throw new Error(
        "please check if it is '?' before passing to this function",
      );
    }
    let date: DateTime = parseDay(day);
    const { hour, minute, weekday } = parse_time(end);
    // check if weekday is correct
    const expected_weekday = date.setLocale("en").weekdayShort;
    if (expected_weekday !== weekday) {
      console.log(
        "weekday in end and day are different, this can indicate an allnighter ;)",
        {
          weekday,
          expected_weekday,
        },
      );
      date = date.set({ weekday: weekdayShortToNumber(weekday) });
    }
    // set time
    return date.set({ hour, minute });
  }
}

export function import_from_simons_bot_format(data: SimonsBotFormatEntry[]) {
  // validate its the right format
  // is array?
  if (!Array.isArray(data)) {
    throw new Error("Data has wrong format: expected an array");
  }
  // has all fields?
  if (
    !data.every((entry) => {
      const check =
        typeof entry.day === "string" &&
        entry.day.length == 8 &&
        (typeof entry.duration === "number" ||
          typeof entry.duration === "string") &&
        typeof entry.start === "string" &&
        typeof entry.end === "string" &&
        typeof entry.label === "string";
      if (!check) {
        console.log("has-all-fields check failed", entry);
      }
      return check;
    })
  ) {
    throw new Error(
      "Data has wrong format: fields are missing or have wrong format",
    );
  }

  // convert to our task entry format
  const entries: TaskEntry[] = [];

  for (const data_entry of data) {
    const entry: TaskEntry = {
      // generate a deteministic fake label from data
      id: `import-${data_entry.label}-${data_entry.start}-${data_entry.day}`,
      label: data_entry.label,
      start: simons_bot_format
        .parseStartDate(data_entry.day, data_entry.start)
        .toMillis(),
    };

    if (data_entry.end !== "?") {
      entry.end = simons_bot_format
        .parseEndDate(data_entry.day, data_entry.end)
        .toMillis();
      // console.log(entry.end, entry.start);

      entry.duration = entry.end - entry.start;
      if (entry.duration < 0) {
        console.log(
          "import: skipped entry with negative duration: ",
          entry.duration,
          entry,
        );
        continue;
      } else if (entry.duration === 0) {
        entry.duration = Duration.fromObject({ minute: 1 }).toMillis();
        entry.end = DateTime.fromMillis(entry.start)
          .plus({ minute: 1 })
          .toMillis();
      }
    }

    entries.push(entry);
  }
  entries.reverse();

  return entries;
}

export function export_to_simons_bot_format(data: TaskEntry[]) {
  const sorted = data
    .filter(({ deleted, is_break }) => !deleted && !is_break)
    .sort((a, b) => a.start - b.start);
  const firstDate = DateTime.fromMillis(sorted[0].start).toFormat("dd.LLL.yy");
  const endDate = DateTime.fromMillis(sorted[sorted.length - 1].start).toFormat(
    "dd.LLL.yy",
  );
  const filename = `${firstDate}-${endDate}`;
  const content: SimonsBotFormatEntry[] = sorted.map((entry) => {
    return {
      day: DateTime.fromMillis(entry.start).toFormat("dd.LL.yy"),
      duration:
        typeof entry.duration !== "undefined"
          ? Duration.fromMillis(entry.duration).shiftTo("minute").minutes || 1
          : "?",
      start: DateTime.fromMillis(entry.start).toFormat("HH:mm EEE"),
      end: entry.end
        ? DateTime.fromMillis(entry.end).toFormat("HH:mm EEE")
        : "?",
      label: entry.label,
    };
  });
  const plainText = JSON.stringify(content, null, 4);
  window.webxdc.sendToChat({
    file: { name: `timetracking_${filename}.json`, plainText },
  });
}

export type ExportFormat = {
  format_version: number;
  [key: string]: any;
};

export type ExportFormatVersion1 = {
  what: "timetracking Webxdc data";
  format_version: 1;
  content: TaskEntryVersion1[];
};

export type TaskEntryVersion1 = {
  /** unique id of entry */
  id: string;
  label: string;
  start: number;
  end?: number;
  /** difference between end-start, cached value for speed */
  duration?: number;
  /** Whether entry is marked as deleted */
  deleted?: true;
  /** for the gtimelog trackmode - if item is break it shall not be counted */
  is_break?: boolean;
  /** Whether entry is was automaticaly ended by the next entry */
  auto?: true;
};

export function export_own_format(content: TaskEntryVersion1[]) {
  const sorted = content
    .filter(({ deleted }) => !deleted)
    .sort((a, b) => a.start - b.start);
  const firstDate = DateTime.fromMillis(sorted[0].start).toFormat("dd.LLL.yy");
  const endDate = DateTime.fromMillis(sorted[sorted.length - 1].start).toFormat(
    "dd.LLL.yy",
  );
  const filename = `${firstDate}-${endDate}`;
  const plainText = JSON.stringify({
    what: "timetracking Webxdc data",
    format_version: 1,
    content: sorted,
  } as ExportFormatVersion1);
  window.webxdc.sendToChat({
    file: { name: `${filename}.ttxdc.json`, plainText },
  });
}

export function import_own_format(rawdata: ExportFormat) {
  // check if has version field and check if we support the version
  if (typeof rawdata.format_version !== "number") {
    throw new Error("unknown format");
  } else if (rawdata.format_version > 1) {
    throw new Error(
      `format_version ${rawdata.format_version} is not supported yet, please try to get a newer version of this xdc`,
    );
  }
  // (if it is higher than supported versions alert the user)
  const data = rawdata as ExportFormatVersion1;
  // validate fields
  if (
    !data.content.every((entry) => {
      return (
        typeof entry.id === "string" &&
        typeof entry.label === "string" &&
        typeof entry.start === "number"
      );
    })
  ) {
    throw new Error("Some Entries are invalid");
  }
  // convert (no conversion needed on this special case)
  return data.content;
}
