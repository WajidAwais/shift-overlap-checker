const ShiftBox = ({ facilityName, shift, selectShift, backgroundColor }) => {
  return (
    <div
      className="shift-box"
      style={{ backgroundColor: backgroundColor }}
      onClick={() => selectShift(shift)}
    >
      {facilityName}
      <br /> {new Date(shift.shift_date).toISOString().split("T")[0]}
      <br />{" "}
      {new Date(shift.start_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}{" "}
      -{" "}
      {new Date(shift.end_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </div>
  );
};

export default ShiftBox;
