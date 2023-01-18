import { useState } from "react";
import { checkOverlap } from "../api";

const TopBar = ({ section }) => {
  const [result, setResult] = useState();
  const submit = () => {
    const [shift1, shift2] = section;
    if (shift1 === undefined || shift2 === undefined || shift1 === shift2) {
      alert("Please select Two Shifts before submitting.");
      return;
    }
    checkOverlap(shift1, shift2).then(setResult);
  };

  return (
    <div className="top-bar">
      <div>
        <p className="result-headings">Overlap Minutes: {result?.overlap}</p>
        <p className="result-headings">Max Overlap Threshold: {result?.max_threshold}</p>
        <p className="result-headings">Exceed Overlap Threshold: {result?.exceeds_threshold?.toString()}</p>
      </div>
      <button className="submit-btn" onClick={submit}>
        Submit
      </button>
    </div>
  );
};

export default TopBar;
