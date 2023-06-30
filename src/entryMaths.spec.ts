import test from "ava";
import {
  getEntriesInTimeframeCutToIt,
  getEntriesTouchingTimeframe,
  isEntryTouchingTimeframe,
} from "./entryMaths";
import type { TaskEntry } from "./store";

const entry: TaskEntry = {
  id: "no id",
  label: "test",
  start: 5_000,
  end: 10_000,
};
// {} is timeframe, [] is entry
test("isEntryTouchingTimeframe [ { ] }", (t) => {
  t.true(isEntryTouchingTimeframe(entry, 6_000, 11_000));
});

test("isEntryTouchingTimeframe { [] }", (t) => {
  t.true(isEntryTouchingTimeframe(entry, 4_000, 12_000));
});

test("isEntryTouchingTimeframe { [ } ]", (t) => {
  t.true(isEntryTouchingTimeframe(entry, 4_000, 7_000));
});

test("isEntryTouchingTimeframe [] {}", (t) => {
  t.false(isEntryTouchingTimeframe(entry, 12_000, 14_000));
});

test("isEntryTouchingTimeframe {} []", (t) => {
  t.false(isEntryTouchingTimeframe(entry, 2_000, 4_000));
});

const entries: TaskEntry[] = [
  {
    id: "1",
    label: "test",
    start: 5_000,
    end: 10_000,
    duration: 5_000,
  },
  {
    id: "2",
    label: "build",
    start: 11_000,
    end: 12_000,
    duration: 1_000,
  },
  {
    id: "3",
    label: "compile",
    start: 17_000,
    end: 22_000,
    duration: 5_000,
  },
];

test("getEntriesTouchingTimeframe", (t) => {
  t.deepEqual(getEntriesTouchingTimeframe(entries, 11_000, 14_000), [
    entries[1],
  ]);
  t.deepEqual(getEntriesTouchingTimeframe(entries, 11_000, 18_000), [
    entries[1],
    entries[2],
  ]);
  t.deepEqual(getEntriesTouchingTimeframe(entries, 11_000, 30_000), [
    entries[1],
    entries[2],
  ]);
  t.deepEqual(getEntriesTouchingTimeframe(entries, 9_000, 30_000), [
    entries[0],
    entries[1],
    entries[2],
  ]);
});

test("getEntriesInTimeframeCutToIt", (t) => {
  t.deepEqual(getEntriesInTimeframeCutToIt(entries, 6_000, 18_000), [
    { ...entries[0], start: 6_000, duration: 4_000 },
    entries[1],
    { ...entries[2], end: 18_000, duration: 1_000 },
  ]);
  t.deepEqual(getEntriesInTimeframeCutToIt(entries, 6_000, 30_000), [
    { ...entries[0], start: 6_000, duration: 4_000 },
    entries[1],
    entries[2],
  ]);
  t.deepEqual(getEntriesInTimeframeCutToIt(entries, 6_500, 11_500), [
    { ...entries[0], start: 6_500, duration: 3_500 },
    { ...entries[1], end: 11_500, duration: 500 },
  ]);
});

// start and end outside
const entries2 = [
  {
    id: "3",
    label: "compile",
    start: 11_000,
    end: 2_211_000,
    duration: 2_200_000,
  },
];

test("getEntriesTouchingTimeframe start and end outside", (t) => {
  t.deepEqual(getEntriesTouchingTimeframe(entries2, 40_000, 45_000), [
    entries2[0],
  ]);
});
test("getEntriesInTimeframeCutToIt start and end outside", (t) => {
  t.deepEqual(getEntriesInTimeframeCutToIt(entries2, 40_000, 45_000), [
    { ...entries2[0], start: 40_000, end: 45_000, duration: 5_000 },
  ]);
});

test("getEntriesTouchingTimeframe start outside, no end", (t) => {
  const entries2: TaskEntry[] = [
    {
      id: "3",
      label: "compile",
      start: 11_000,
    },
  ];

  t.deepEqual(getEntriesTouchingTimeframe(entries2, 40_000, 45_000), [
    entries2[0],
  ]);
});
