import { useEffect, useState } from "react";
import { getShifts } from "../api";
import ShiftBox from "./ShiftBox";

const ShiftSection = ({ section, setSection }) => {
  const [shifts, setShifts] = useState([]);
  useEffect(() => {
    getShifts().then(setShifts);
  }, []);

  const selectShift = (shift) => {
    if (section[0] === shift.shift_id) {
      setSection([undefined, section[1]]);
    } else if (section[1] === shift.shift_id) {
      setSection([undefined, section[0]]);
    } else {
      setSection([section[1], shift.shift_id]);
    }
  };

  return (
    <div className="shifts-section">
      {shifts.map((shift) => (
        <ShiftBox
          key={shift.shift_id}
          facilityName={shift.facility?.facility_name}
          shift={shift}
          selectShift={selectShift}
          backgroundColor={section.includes(shift.shift_id) ? "aquamarine" : "white"}
        />
      ))}
    </div>
  );
};

export default ShiftSection;
