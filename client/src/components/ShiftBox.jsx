import { formatDate, formatTime } from "../time";

const ShiftBox = ({ facilityName, shift, selectShift, backgroundColor }) => {
  return (
    <div className="shift-box" style={{ backgroundColor }} onClick={() => selectShift(shift)}>
      {facilityName}
      <br /> {formatDate(shift.shift_date)}
      <br /> {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
    </div>
  );
};

export default ShiftBox;
