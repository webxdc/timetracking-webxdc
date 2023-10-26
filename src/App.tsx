import {
  Outlet,
  useLocation,
  useNavigate,
  useNavigation,
} from "react-router-dom";

import "./App.css";
import {
  BugAntIcon,
  ChartPieIcon,
  ClockIcon,
  QueueListIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { wrapPromise } from "./util";
import { init } from "./store";

const initializeStore = wrapPromise(init());

function App() {
  initializeStore.read();
  const devmode = localStorage.getItem("devmode") === "true" || false;

  const navigate = useNavigate();
  let location = useLocation();

  const isActive = (page: string) => {
    return location.pathname.startsWith("/" + page) ? "active" : undefined;
  };

  return (
    <div className="flex h-full flex-col" style={{ maxHeight: "100vh" }}>
      <div
        className="relative flex-grow overflow-auto"
        style={{ maxHeight: "calc(100vh - 4rem)" }}
      >
        <Outlet />
      </div>
      <div className="btm-nav" style={{ position: "relative" }}>
        <button
          className={location.pathname === "/" ? "active" : undefined}
          onClick={() => navigate("/")}
        >
          <ClockIcon className="h-5 w-5" />
          <span className="btm-nav-label">Track</span>
        </button>
        <button
          className={isActive("entries")}
          onClick={() => {
            navigate("/entries");
          }}
        >
          <QueueListIcon className="h-5 w-5" />
          <span className="btm-nav-label">Entries</span>
        </button>
        <button
          className={isActive("stats")}
          onClick={() => navigate("/stats")}
        >
          <ChartPieIcon className="h-5 w-5" />
          <span className="btm-nav-label">Statistics</span>
        </button>
        <button className={isActive("more")} onClick={() => navigate("/more")}>
          <Squares2X2Icon className="h-5 w-5" />
          <span className="btm-nav-label">More</span>
        </button>
        {devmode && (
          <button
            className={isActive("debug")}
            onClick={() => navigate("/debug")}
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
