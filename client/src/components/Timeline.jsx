import { formatTime, shiftRange } from "../time";

const pct = (value, from, span) => `${((value - from) / span) * 100}%`;

// Draws both shifts on one axis, with the shared stretch hatched.
export default function Timeline({ first, second }) {
  const a = shiftRange(first);
  const b = shiftRange(second);
  const from = Math.min(a.start, b.start);
  const to = Math.max(a.end, b.end);
  const span = Math.max(to - from, 1);
  const overlapStart = Math.max(a.start, b.start);
  const overlapEnd = Math.min(a.end, b.end);

  const bar = (range, slot) => (
    <div className="timeline__row">
      <span className="timeline__label">{slot}</span>
      <div className="timeline__track">
        <div
          className={`timeline__bar timeline__bar--${slot.toLowerCase()}`}
          style={{ left: pct(range.start, from, span), width: pct(range.end, range.start, span) }}
        />
        {overlapEnd > overlapStart && (
          <div
            className="timeline__overlap"
            style={{ left: pct(overlapStart, from, span), width: pct(overlapEnd, overlapStart, span) }}
          />
        )}
      </div>
    </div>
  );

  const label = (ms) => formatTime(new Date(ms).toISOString());

  return (
    <figure className="timeline" aria-label="Timeline of the two shifts">
      {bar(a, "A")}
      {bar(b, "B")}
      <figcaption className="timeline__axis">
        <span>{label(from)}</span>
        <span>{label(to)}</span>
      </figcaption>
    </figure>
  );
}
