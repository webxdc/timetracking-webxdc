import { DateTime } from "luxon";
import { TaskEntry } from "./store";

function inRange(point: number, start: number, end: number) {
  return point >= start && point <= end;
}

export function isEntryTouchingTimeframe(
  entry: TaskEntry,
  start: number,
  end: number
) {
  // {} is timeframe, [] is entry
  // yes
  // [{]} end inside
  // {[]} both inside
  // {[}] start inside
  // [{}] timeframe inside
  // no
  // [] {} non inside
  // {} [] none inside
  const start_is_inside = inRange(entry.start, start, end);
  if (entry.end) {
    const is_timeframe_inside =
      inRange(start, entry.start, entry.end) ||
      inRange(end, entry.start, entry.end);
    return (
      start_is_inside || inRange(entry.end, start, end) || is_timeframe_inside
    );
  } else {
    return start_is_inside || entry.start < start;
  }
}

/** get all entries that touch a timeframe */
export function getEntriesTouchingTimeframe(
  entries: TaskEntry[],
  start: number,
  end: number
) {
  return entries.filter((entry) => isEntryTouchingTimeframe(entry, start, end));
}

/** get a list of entries that are in a timeframe, but they are cut to fit the timeframe,
 * so don't edit them from there or anything like that
 * (because they might not exist like that, always fetch the real events via their id)
 * items that are still runing are also caped to the end */
export function getEntriesInTimeframeCutToIt(
  entries: TaskEntry[],
  start: number,
  end: number
) {
  const inFrame = getEntriesTouchingTimeframe(entries, start, end);
  const inFrameCloned: TaskEntry[] = JSON.parse(JSON.stringify(inFrame));
  // find entries that are at border and modify them (clone them first not modify the original one)
  for (const entry of inFrameCloned) {
    if (
      !entry.end ||
      inRange(entry.start, start, end) !== inRange(entry.end, start, end) ||
      inRange(start, entry.start, entry.end) ||
      inRange(end, entry.start, entry.end)
    ) {
      if (entry.start < start) {
        entry.start = start;
      }
      if (entry.end) {
        if (entry.end > end) {
          entry.end = end;
        }
      } else {
        entry.end = end;
      }
      // don't forget to recalc duration
      entry.duration = entry.end - entry.start;
    }
  }
  // return the modfied entries
  return inFrameCloned;
}

export function getMonthsOfEntry(
  entry: TaskEntry
): { month: number; year: number }[] {
  const start = DateTime.fromMillis(entry.start);
  const startMonth: { month: number; year: number } = {
    month: start.month,
    year: start.year,
  };
  let endMonth: { month: number; year: number } | null = null;
  if (entry.end) {
    const end = DateTime.fromMillis(entry.end);
    if (startMonth.month === end.month && startMonth.year === end.year) {
      return [startMonth];
    } else {
      return [startMonth, { month: end.month, year: end.year }];
    }
  } else {
    return [startMonth];
  }
}
