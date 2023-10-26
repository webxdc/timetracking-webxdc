import { DateTime } from "luxon";
import { useStore } from "../store";

// shows action history and some internal stats
export function DebugPage() {
  const store = useStore();

  const total_entries = store.entries.length;
  const non_deleted_entries = store.entries.filter(
    ({ deleted }) => !deleted,
  ).length;
  const break_entries = store.entries.filter(
    ({ deleted, is_break }) => !deleted && is_break,
  ).length;
  const normal_entries = non_deleted_entries - break_entries;
  const deleted_entries = total_entries - normal_entries;

  return (
    <div>
      <div className="p-2">
        <p>
          You can now access the internal data store via{" "}
          <code className="rounded bg-slate-300 p-1">window.store()</code>{" "}
          object and{" "}
          <code className="rounded bg-slate-300 p-1">window.actions</code> for
          sending updates in your dev console. Besides that you can find the
          complete action log and some internal stats on this page:
        </p>

        <table>
          <tbody>
            <tr>
              <td>Total Entries:</td>
              <td>
                {total_entries} / {non_deleted_entries} ({break_entries}/
                {normal_entries}) / {deleted_entries}
                <br /> (total / normal (break/tracked) / deleted)
              </td>
            </tr>
            <tr>
              <td>Unique Labels:</td>
              <td>{Object.keys(store.labels).length}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        {[...store.actionHistory].reverse().map((ah) => (
          <div className="m-2" key={ah.who + ah.when + ah.id}>
            {DateTime.fromMillis(ah.when).toLocaleString(
              DateTime.DATETIME_SHORT,
            )}
            : {ah.who}: {ah.what}{" "}
            {ah.id ? (
              <div className="inline-block rounded border border-solid border-slate-400">
                Entry: {ah.id}
              </div>
            ) : (
              ""
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
