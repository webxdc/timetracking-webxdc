import { Suspense, useContext } from "react";
import { NavigationContext } from "../../App";
import { wrapPromise } from "../../util";

export function CreditsPage() {
  const { navigate } = useContext(NavigationContext);

  return (
    <div>
      <button
        className="w-full p-2 text-start"
        onClick={() => navigate("more")}
      >
        &lt; Back To More
      </button>
      <hr />

      <h1 className="px-2 py-1 text-2xl">Credits</h1>

      <div className="px-2">
        <p>This webxdc app was made by:</p>
        <ul className="mx-2 list-inside">
          <li className="list-disc font-bold">Simon Laux</li>
          <li className="list-disc font-thin">
            and maybe You? If you want to see your name here, please contribute
            on github
          </li>
        </ul>
        <h1 className="text-xl">
          This project makes use of the following dependencies
        </h1>
        <p>
          This project makes use of the following packages, thanks to all
          projects that we used:
        </p>
        <Suspense fallback={<>Loading</>}>
          <Licenses />
        </Suspense>
      </div>
    </div>
  );
}

const LicenseTXT = wrapPromise(
  fetch("./DependencyLicenses.txt").then((r) => r.text())
);

function Licenses() {
  const licenseTxt = LicenseTXT.read();

  return (
    <code
      className="mt-2 block overflow-x-hidden overflow-y-scroll rounded border-2 border-solid border-slate-300 p-2"
      style={{ maxHeight: "50vh", whiteSpace: "pre-line" }}
    >
      {licenseTxt}
    </code>
  );
}
