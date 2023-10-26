import { useNavigate } from "react-router-dom";

export function AboutPage() {
  const navigate = useNavigate();

  const USPs = [
    "It's timetracking on multiple devices, but without the need for a cloud.",
    "You own your data.",
    "Aims to be easy to use.",
    "Nothing to install, because it's a webxdc app.",
  ];

  return (
    <div className="flex h-full flex-col">
      <button className="w-full p-2 text-start" onClick={() => navigate(-1)}>
        &lt; Back
      </button>
      <hr />
      <div className="overflow-y-scroll">
        <h1 className="px-2 py-1 text-2xl">About Timetracking</h1>
        <div className="px-2">
          <p>
            This is a simple timetracking webxdc app, it meant to be used by{" "}
            <b>one user</b>.
          </p>
          <h2 className="pb-1 pt-2 text-lg">Why use it?</h2>
          <ul className="mx-2 list-inside">
            {USPs.map((usp, index) => (
              <li className="list-disc" key={index}>
                {usp}
              </li>
            ))}
          </ul>
          <h2 className="pb-1 pt-2 text-lg">How can I use it?</h2>
          <p>
            You can send it to youself in the saved messages and timetrack
            across multiple devices, if you use different accounts on your
            devices, you could make a group and use it there on all your
            devices.
          </p>
          <h2 className="pb-1 pt-2 text-lg">Why is it only for one User?</h2>
          <p>
            Currently the app is made for single user usage. There is no concept
            of multiple users and you can not track parallel tasks. Though later
            there could be a fork of this app or a build flavor that supports
            multiple concurent users.
          </p>
        </div>
      </div>
    </div>
  );
}
