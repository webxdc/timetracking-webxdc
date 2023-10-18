import { useContext, useState } from "react";
import { NavigationContext } from "../App";

export function MorePage() {
  const { navigate } = useContext(NavigationContext);

  const [auto_complete, internal_set_autocomplete] = useState(
    localStorage.getItem("autocomplete_enabled") === "true"
  );
  const setAutoComplete = (value: boolean) => {
    localStorage.setItem("autocomplete_enabled", String(!auto_complete));
    internal_set_autocomplete(value);
  };

  const [hide_track_page_stats, internal_set_hide_track_page_stats] = useState(
    localStorage.getItem("hide_track_page_stats") === "true"
  );
  const setHideTrackPageStats = (value: boolean) => {
    localStorage.setItem("hide_track_page_stats", String(value));
    internal_set_hide_track_page_stats(value);
  };

  // const devModeActive = localStorage.getItem("devmode") === "true" || false;

  return (
    <div className="p-5">
      <h1 className="text-xl">About</h1>
      <p>
        This is a simple timetracking webxdc app, it meant to be used by one
        user. Later there could be a fork of this app or a build flavor that
        supports multiple concurent users. You can send it to youself in the
        saved messages and timetrack across multiple devices, if you use
        different accounts on your devices, you could make a group and use it
        there on all your devices.
      </p>
      <p>
        It's timetracking on multiple devices, but without the need for a cloud.
      </p>
      <h1 className="text-xl">Options</h1>
      <label className="label cursor-pointer">
        <span className="label-text">
          Auto complete task labels (experimental)
        </span>
        <input
          type="checkbox"
          checked={auto_complete}
          onChange={() => setAutoComplete(!auto_complete)}
        />
      </label>
      <label className="label cursor-pointer">
        <span className="label-text">Hide Stats Summary on Track Page</span>
        <input
          type="checkbox"
          checked={hide_track_page_stats}
          onChange={() => setHideTrackPageStats(!hide_track_page_stats)}
        />
      </label>
      <div className="m-1">
        <hr />
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("more/backup")}
        >
          Backup (Import / Export) &gt;
        </button>
        <hr />
        <button
          className="w-full p-2 text-start"
          onClick={() => navigate("more/credits")}
        >
          Credits &gt;
        </button>
        <hr />
      </div>
    </div>
  );
}
