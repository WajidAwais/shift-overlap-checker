import { dateKey, durationMinutes, formatDate, formatDuration, formatTime, isOvernight } from "../time";

function groupByDate(shifts) {
  const groups = new Map();
  for (const shift of shifts) {
    const key = dateKey(shift.shift_date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(shift);
  }
  return [...groups.entries()];
}

function ShiftCard({ shift, slot, onToggle }) {
  const facility = shift.facility?.facility_name ?? "No facility";
  const duration = formatDuration(durationMinutes(shift));
  const overnight = isOvernight(shift);
  const label = [
    `${formatTime(shift.start_time)} to ${formatTime(shift.end_time)}`,
    formatDate(shift.shift_date),
    facility,
    `shift ${shift.shift_id}`,
    duration,
    overnight && "overnight",
    slot && `selected as ${slot}`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <li>
      <button
        type="button"
        className={`shift-card${slot ? ` shift-card--${slot.toLowerCase()}` : ""}`}
        aria-pressed={Boolean(slot)}
        aria-label={label}
        onClick={() => onToggle(shift.shift_id)}
      >
        <span className="shift-card__slot">{slot ?? ""}</span>
        <span className="shift-card__time">
          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
        </span>
        <span className="shift-card__facility">{facility}</span>
        <span className="shift-card__meta">
          #{shift.shift_id} · {duration}
          {overnight && <span className="tag">overnight</span>}
        </span>
      </button>
    </li>
  );
}

export default function ShiftBoard({ shifts, selected, onToggle }) {
  return (
    <section className="board" aria-labelledby="board-title">
      <div className="section-head">
        <h2 id="board-title">Shifts</h2>
        <p className="section-head__hint">Select two. A third click replaces the older pick.</p>
      </div>

      {shifts.status === "loading" && <p className="state" role="status">Loading shifts…</p>}
      {shifts.status === "error" && (
        <div className="state state--error" role="alert">
          <p>Could not load shifts: {shifts.error.message}</p>
          <button type="button" className="btn btn--ghost" onClick={() => shifts.run()}>
            Try again
          </button>
        </div>
      )}
      {shifts.status === "success" && shifts.data.length === 0 && (
        <p className="state">No shifts yet. Run <code>npm run db:seed</code> to load the demo rota.</p>
      )}

      {shifts.status === "success" &&
        groupByDate(shifts.data).map(([day, dayShifts]) => (
          <div className="day" key={day}>
            <h3 className="day__title">{formatDate(dayShifts[0].shift_date)}</h3>
            <ul className="day__list">
              {dayShifts.map((shift) => {
                const index = selected.indexOf(shift.shift_id);
                return (
                  <ShiftCard
                    key={shift.shift_id}
                    shift={shift}
                    slot={index === -1 ? null : "AB"[index]}
                    onToggle={onToggle}
                  />
                );
              })}
            </ul>
          </div>
        ))}
    </section>
  );
}
