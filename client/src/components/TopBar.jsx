import shiftsService from "../Services/ShiftsService";
import { useState } from "react";

const TopBar = ({ section }) => {
  const [minutes, setMinutes] = useState();
  const [threshold, setThreshold] = useState();
  const [exceed, setExceed] = useState();
  const checkOverlap = () => {
    const shift1 = section[0];
    const shift2 = section[1];
    if (shift1 === undefined || shift2 === undefined || shift1 === shift2) {
      alert('Please select Two Shifts before submitting.');
      return;
    }
    shiftsService.checkOverlap(shift1, shift2).then((data) => {
      setMinutes(data.data.overlap);
      setThreshold(data.data.max_threshold);
      setExceed(data.data.exceeds_threshold);
    });
  };

  return (
    <div className="top-bar">
      <div>
        <p className="result-headings">Overlap Minutes: { minutes }</p>
        <p className="result-headings">Max Overlap Threshold: { threshold }</p>
        <p className="result-headings">Exceed Overlap Threshold: { exceed?.toString() }</p>
      </div>
      <button className="submit-btn" onClick={checkOverlap} >Submit</button>
    </div>
  );
};

export default TopBar;
