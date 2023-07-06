import { useState } from "react";

import "./App.css";
import {
  BugAntIcon,
  ChartPieIcon,
  ClockIcon,
  QueueListIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { TrackPage } from "./pages/TrackPage";
import { EntriesPage } from "./pages/EntriesPage";
import { MorePage } from "./pages/MorePage";
import { wrapPromise } from "./util";
import { init, TaskEntry } from "./store";
import { DebugPage } from "./pages/DebugPage";
import { EntryPage } from "./pages/EntryPage";
import { StatisticsPage } from "./pages/StatisticsPage";

const initializeStore = wrapPromise(init());

function App() {
  initializeStore.read();
  const [activePage, changePage] = useState<
    "track" | "entries" | "stats" | "more" | "debug"
  >("track");

  const devmode = localStorage.getItem("devmode") === "true" || false;

  let Page;
  const [selectedEntry, selectEntry] = useState<TaskEntry["id"] | null>(null);

  switch (activePage) {
    case "track":
      Page = TrackPage;
      break;
    case "entries":
      if (selectedEntry) {
        Page = () => <EntryPage id={selectedEntry} selectEntry={selectEntry} />;
      } else {
        Page = () => <EntriesPage selectEntry={selectEntry} />;
      }
      break;
    case "stats":
      Page = StatisticsPage;
      break;
    case "more":
      Page = MorePage;
      break;
    case "debug":
      Page = DebugPage;
      break;
    default:
      Page = () => <>no page selected</>;
      break;
  }

  return (
    <div className="flex h-full flex-col" style={{ maxHeight: "100vh" }}>
      <div
        className="relative flex-grow overflow-auto"
        style={{ maxHeight: "calc(100vh - 4rem)" }}
      >
        <Page />
      </div>
      <div className="btm-nav" style={{ position: "relative" }}>
        <button
          className={activePage === "track" ? "active" : ""}
          onClick={() => changePage("track")}
        >
          <ClockIcon className="h-5 w-5" />
          <span className="btm-nav-label">Track</span>
        </button>
        <button
          className={activePage === "entries" ? "active" : ""}
          onClick={() => {
            if (activePage === "entries") {
              selectEntry(null);
            }
            changePage("entries");
          }}
        >
          <QueueListIcon className="h-5 w-5" />
          <span className="btm-nav-label">Entries</span>
        </button>
        <button
          disabled={!devmode}
          className={activePage === "stats" ? "active" : ""}
          onClick={() => changePage("stats")}
        >
          <ChartPieIcon className="h-5 w-5" />
          <span className="btm-nav-label">Statistics</span>
        </button>
        <button
          className={activePage === "more" ? "active" : ""}
          onClick={() => changePage("more")}
        >
          <Squares2X2Icon className="h-5 w-5" />
          <span className="btm-nav-label">More</span>
        </button>
        {devmode && (
          <button
            className={activePage === "debug" ? "active" : ""}
            onClick={() => changePage("debug")}
          >
            <BugAntIcon className="h-5 w-5" />
            <span className="btm-nav-label">Debug</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
