import { getReport } from "../api";

const Q4to6 = () => {
  return (
    <div className="querysec">
      {["q4", "q5", "q6"].map((name) => (
        <button key={name} className="submit-btn" onClick={() => getReport(name).then(console.log)}>
          Execute {name.toUpperCase()} Query
        </button>
      ))}
    </div>
  );
};

export default Q4to6;
