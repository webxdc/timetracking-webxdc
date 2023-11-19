import { createHashRouter, useRouteError } from "react-router-dom";
import App from "./App";
import { DebugPage } from "./pages/DebugPage";
import { EntriesPage } from "./pages/EntriesPage";
import { EntryPage } from "./pages/entries/EntryPage";
import { AboutPage } from "./pages/more/AboutPage";
import { BackupPage } from "./pages/more/BackupPage";
import { CreditsPage } from "./pages/more/CreditsPage";
import { OptionsPage } from "./pages/more/OptionsPage";
import { MorePage } from "./pages/MorePage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { DaysInMonthsPage } from "./pages/stats/DaysInMonthsPage";
import { DaysInWeeksPage } from "./pages/stats/DaysInWeeksPage";
import { TrackPage } from "./pages/TrackPage";
import { CreateEntryPage } from "./pages/entries/CreateEntryPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <TrackPage />,
        index: true,
      },
      {
        path: "entries",
        element: <EntriesPage />,
      },
      {
        path: "entries/create",
        element: <CreateEntryPage />,
      },
      {
        path: "entries/:id",
        element: <EntryPage />,
      },
      {
        path: "stats",
        element: <StatisticsPage />,
      },
      {
        path: "stats/weeks",
        element: <DaysInWeeksPage />,
      },
      {
        path: "stats/months",
        element: <DaysInMonthsPage />,
      },
      {
        path: "more",
        element: <MorePage />,
      },
      {
        path: "more/about",
        element: <AboutPage />,
      },
      {
        path: "more/options",
        element: <OptionsPage />,
      },
      {
        path: "more/backup",
        element: <BackupPage />,
      },
      {
        path: "more/credits",
        element: <CreditsPage />,
      },
      {
        path: "debug",
        element: <DebugPage />,
      },
    ],
  },
]);

export default function ErrorPage() {
  const error: any = useRouteError();
  console.error(error);

  return (
    <div id="error-page">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
    </div>
  );
}
