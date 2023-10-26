import { DateTime } from "luxon";
import { useContext, useEffect, useRef, useState } from "react";
import { importEntries, useStore } from "../../store";
import { getEntriesInTimeframeCutToIt } from "../../entryMaths";
import {
  export_own_format,
  export_to_simons_bot_format,
  import_from_simons_bot_format,
  import_own_format,
} from "../../imex";
import { Dialog } from "@headlessui/react";
import { useNavigate } from "react-router-dom";

export function BackupPage() {
  const navigate = useNavigate();
  const devModeActive = localStorage.getItem("devmode") === "true" || false;

  const monthsWithEntries = useStore((s) => s.monthsWithEntries);
  const exportDisabled = useStore((s) => s.entries.length === 0);

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
            DateTime.DATE_SHORT,
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

  const [whyIsMyMonthMissingShown, setWhyIsMyMonthMissingShown] =
    useState<boolean>(false);

  return (
    <div className="flex h-full flex-col">
      <button className="w-full p-2 text-start" onClick={() => navigate(-1)}>
        &lt; Back
      </button>
      <hr />
      <div className="overflow-y-scroll">
        <h1 className="px-2 py-1 text-2xl">Backup</h1>
        <div className="px-2">
          <p>
            Here you can export or import backups of your Time tracking data.
          </p>
          <p>
            This is useful when you want to update to a new version or just a
            new instance of this xdc app that was posted in another chat.
          </p>
          <p>
            Importing-from and exporting-to other apps could also be available
            here in the future.
          </p>
          <h1 className="py-1 text-xl">Import</h1>
          <button
            className="basic-btn"
            onClick={importFiles.bind(null, "AppFormat")}
          >
            Import Backup
          </button>
          {devModeActive && (
            <button
              className="basic-btn"
              onClick={importFiles.bind(null, "BotFormat")}
            >
              Import from simon's bot format
            </button>
          )}
          <h1 className="py-1 text-xl">Export</h1>

          <div className="form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text">
                What should the export include?
              </span>
            </label>
            <select className="select-bordered select" ref={rangeSelection}>
              {exportRanges.map(({ label, range }) => (
                <option key={range} value={range}>
                  {label}
                </option>
              ))}
            </select>

            <label className="label">
              <span className="label-text-alt"></span>
              <span
                className="label-text-alt underline"
                onClick={() => setWhyIsMyMonthMissingShown(true)}
              >
                why is my month not shown?
              </span>
            </label>
          </div>
          <button
            className="basic-btn"
            onClick={exportData.bind(null, "AppFormat")}
            disabled={exportDisabled}
          >
            Export Backup
          </button>
          {devModeActive && (
            <button
              className="basic-btn"
              onClick={exportData.bind(null, "BotFormat")}
              disabled={exportDisabled}
            >
              Export to simon's bot format
            </button>
          )}
          {exportDisabled && (
            <p>Export is disabled because there are no entries</p>
          )}
          <p>
            The export does not include action history, it just includes the
            task entries. Deleted entries are also not exported.
          </p>
        </div>
      </div>
      {whyIsMyMonthMissingShown && (
        <AlertDialog
          onClose={() => setWhyIsMyMonthMissingShown(false)}
          title={"Why is my month not shown?"}
          message={`Restart the app if your month is not shown,
If that does not help check in the entries tab if there are any entries in the month you want to export.`}
        />
      )}
    </div>
  );
}

function AlertDialog({
  title,
  message,
  onClose,
}: {
  title?: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-4">
          <Dialog.Title as="h3" className="text-lg font-bold">
            {title}
          </Dialog.Title>
          <Dialog.Description>{message}</Dialog.Description>
          <button className="basic-btn float-right" onClick={() => onClose()}>
            Ok
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
