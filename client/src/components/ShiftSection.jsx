import shiftsService from "../Services/ShiftsService";
import { useEffect, useState } from "react";
import ShiftBox from "./ShiftBox";

const ShiftSection = ({section, setSection}) => {
  const [shifts, setShifts] = useState([]);
  const getShifts = () => {
    shiftsService.getShifts().then((data) => {
      setShifts(data.data.question_one_shifts);
      debugger;
    });
  };
  useEffect(getShifts, []);

  const selectShift = (shift) => {
    if (section[0] === (shift.shift_id)) {
      setSection([undefined, section[1]])
    }
    else if (section[1] === (shift.shift_id)) {
      setSection([undefined, section[0]])
    }
    else {
      setSection([section[1], shift.shift_id])
    }
  }

  const backgroundColor = (shift) => {
    return section.includes(shift.shift_id) ? "aquamarine" : "white"
  }

  const shiftsList = shifts.map((shift) => {
    return (
      <ShiftBox
        key={shift.shift_id}
        facilityName={shift.facility.facility_name}
        shift={shift}
        selectShift={selectShift}
        backgroundColor={backgroundColor(shift)}
      />
    );
  });
  return <div className="shifts-section">{shiftsList}</div>;
};

export default ShiftSection;
