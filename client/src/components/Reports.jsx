import { useState } from "react";
import { getReport } from "../api";
import { useRequest } from "../useRequest";

const REPORTS = {
  q4: {
    tab: "Open spots",
    description: "Spots still to fill per facility and nurse type.",
    columns: [
      ["facility_id", "Facility"],
      ["nurse_type_needed", "Nurse type"],
      ["total_number_nurses_needed", "Needed"],
      ["remaining_spots", "Open"],
    ],
  },
  q5: {
    tab: "Jobs per nurse",
    description: "Open jobs matching each nurse's type that they have not been hired for.",
    columns: [
      ["nurse_name", "Nurse"],
      ["nurse_type", "Type"],
      ["total_remaining_jobs", "Open jobs"],
      ["remaining_spots", "Open spots"],
    ],
  },
  q6: {
    tab: "Coworkers",
    description: "Nurses hired at any facility where this nurse works.",
    columns: [["nurse_name", "Nurse"]],
  },
};

const fetchReport = (name, nurse) =>
  getReport(name === "q6" ? `q6?nurse=${encodeURIComponent(nurse)}` : name);

export default function Reports() {
  const [active, setActive] = useState(null);
  const [nurse, setNurse] = useState("Anne");
  const report = useRequest(fetchReport);

  const open = (name) => {
    setActive(name);
    report.run(name, nurse);
  };

  const config = active && REPORTS[active];

  return (
    <section className="reports" aria-labelledby="reports-title">
      <div className="section-head">
        <h2 id="reports-title">Staffing reports</h2>
      </div>
      <div className="tabs" role="group" aria-label="Choose a report">
        {Object.entries(REPORTS).map(([name, { tab }]) => (
          <button
            key={name}
            type="button"
            className="tab"
            aria-pressed={active === name}
            onClick={() => open(name)}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === "q6" && (
        <form
          className="nurse-form"
          onSubmit={(event) => {
            event.preventDefault();
            report.run("q6", nurse);
          }}
        >
          <label htmlFor="nurse-name">Nurse name</label>
          <input id="nurse-name" value={nurse} onChange={(e) => setNurse(e.target.value)} />
          <button type="submit" className="btn btn--ghost">
            Show
          </button>
        </form>
      )}

      {!active && <p className="state">Choose a report to run it against the database.</p>}
      {config && <p className="reports__description">{config.description}</p>}
      {report.status === "loading" && (
        <p className="state" role="status">
          Running report…
        </p>
      )}
      {report.status === "error" && (
        <p className="state state--error" role="alert">
          Report failed: {report.error.message}
        </p>
      )}
      {report.status === "success" && config && report.data.length === 0 && (
        <p className="state">No rows for this report.</p>
      )}
      {report.status === "success" && config && report.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {config.columns.map(([key, label]) => (
                  <th key={key} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.data.map((row, i) => (
                <tr key={i}>
                  {config.columns.map(([key]) => (
                    <td key={key}>{row[key] ?? "–"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
