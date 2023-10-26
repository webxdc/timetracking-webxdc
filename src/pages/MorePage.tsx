import { useNavigate } from "react-router-dom";
import { version } from "../../package.json";

export function MorePage() {
  const navigate = useNavigate();

  // const devModeActive = localStorage.getItem("devmode") === "true" || false;

  return (
    <div className="p-5">
      <div className="flex flex-col items-center pb-4">
        <img className="w-28 rounded-lg" src="icon.png" />
        <div className="pt-2 text-2xl">TimeTracking.xdc</div>
        <div className="text-sm">Version {version}</div>
      </div>
      <div className="m-1">
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("/more/about")}
        >
          About TimeTracking.xdc &gt;
        </button>
        <hr />
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("/more/options")}
        >
          Options &gt;
        </button>
        <hr />
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("/more/backup")}
        >
          Backup (Import / Export) &gt;
        </button>
        <hr />
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("/more/credits")}
        >
          Credits &gt;
        </button>
        <hr />
      </div>
    </div>
  );
}
