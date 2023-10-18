import { DateTime } from "luxon";
import { useContext, useEffect, useRef, useState } from "react";
import { NavigationContext } from "../App";
import { getEntriesInTimeframeCutToIt } from "../entryMaths";
import {
  export_own_format,
  export_to_simons_bot_format,
  import_from_simons_bot_format,
  import_own_format,
} from "../imex";
import { importEntries, useStore } from "../store";

export function MorePage() {
  const { navigate } = useContext(NavigationContext);
  const monthsWithEntries = useStore((s) => s.monthsWithEntries);

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

  const importFiles = async (format: "BotFormat" | "AppFormat") => {
    let files = await window.webxdc.importFiles({
      extensions: [".json"],
      mimeTypes: ["text/json"],
      multiple: true,
    });
    for (const file of files) {
      try {
        let data = JSON.parse(await file.text());
        let entries;
        // IDEA: check/guess format, then we'd only need one button
        if (format === "BotFormat") {
          entries = import_from_simons_bot_format(data);
        } else if (format === "AppFormat") {
          entries = import_own_format(data);
        }
        entries && importEntries(entries);
        // todo show sucess to user? how many entries were imported?
      } catch (error) {
        console.error("import error", error);
        // todo show error to user?
      }
    }
    useStore.getState().refreshMonthsWithEntry();
  };

  type exportRange = { label: string; range: string | "All" };
  const [exportRanges, setExportRanges] = useState<exportRange[]>([]);
  const rangeSelection = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    // get all availible months
    const ranges = monthsWithEntries
      .map((e) => {
        const month = DateTime.fromObject(e);
        const start = DateTime.fromObject(e).startOf("month");
        const end = DateTime.fromObject(e).endOf("month");

        return {
          label: `${month.monthLong} ${month.year} (${start.toLocaleString(
            DateTime.DATE_SHORT
          )} - ${end.toLocaleString(DateTime.DATE_SHORT)})`,
          range: `${start.toMillis()}:${end.toMillis()}`,
        };
      })
      .reverse();

    setExportRanges([{ label: "Everything", range: "All" }, ...ranges]);
  }, [monthsWithEntries]);

  const exportData = (format: "BotFormat" | "AppFormat") => {
    const selection = rangeSelection.current?.value;
    if (!selection) {
      throw new Error("no selection");
    }
    const all_entries = useStore.getState().entries;
    let my_entries = all_entries;
    if (selection !== "All") {
      const [start, end] = selection.split(":").map(Number);
      my_entries = getEntriesInTimeframeCutToIt(my_entries, start, end);
    }

    if (format === "BotFormat") {
      export_to_simons_bot_format(my_entries);
    } else if (format === "AppFormat") {
      export_own_format(my_entries);
    }
  };

  const devModeActive = localStorage.getItem("devmode") === "true" || false;

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
      <h1 className="text-xl">Import / Export</h1>
      <p>
        The export does not include action history, it just includes the task
        entries. Deleted entries are also not exported.
      </p>
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">What should the export include?</span>
        </label>
        <select className="select-bordered select" ref={rangeSelection}>
          {exportRanges.map(({ label, range }) => (
            <option key={range} value={range}>
              {label}
            </option>
          ))}
        </select>
        <label className="label">
          <span className="label-text">
            (restart app if your month is not shown, for now it is not always
            updated on all actions. is is cached for performance but not always
            updated yet)
          </span>
        </label>
      </div>
      {devModeActive && (
        <button
          className="basic-btn"
          onClick={exportData.bind(null, "BotFormat")}
        >
          Export (simon's bot format)
        </button>
      )}
      <button
        className="basic-btn"
        onClick={exportData.bind(null, "AppFormat")}
      >
        Export (timetracking xdc format)
      </button>
      {devModeActive && (
        <button
          className="basic-btn"
          onClick={importFiles.bind(null, "BotFormat")}
        >
          Import (simon's bot format)
        </button>
      )}
      <button
        className="basic-btn"
        onClick={importFiles.bind(null, "AppFormat")}
      >
        Import (timetracking xdc format)
      </button>
      <div className="m-1">
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
