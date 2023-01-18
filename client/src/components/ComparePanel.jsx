import { checkOverlap } from "../api";
import { useRequest } from "../useRequest";
import { formatDate, formatDuration, formatTime } from "../time";
import Timeline from "./Timeline";

function Slot({ slot, shift }) {
  return (
    <div className={`slot slot--${slot.toLowerCase()}`}>
      <span className="slot__badge" aria-hidden="true">{slot}</span>
      {shift ? (
        <div>
          <p className="slot__time">
            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
          </p>
          <p className="slot__meta">
            {formatDate(shift.shift_date)} · {shift.facility?.facility_name ?? "No facility"}
          </p>
        </div>
      ) : (
        <p className="slot__empty">Shift {slot}: pick one from the list</p>
      )}
    </div>
  );
}

export default function ComparePanel({ first, second, onClear }) {
  const result = useRequest(checkOverlap);
  const ready = Boolean(first && second);

  return (
    <section className="compare" aria-labelledby="compare-title">
      <div className="section-head">
        <h2 id="compare-title">Compare</h2>
        {(first || second) && (
          <button type="button" className="btn btn--link" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <Slot slot="A" shift={first} />
      <Slot slot="B" shift={second} />

      <button
        type="button"
        className="btn btn--primary"
        disabled={!ready || result.status === "loading"}
        onClick={() => result.run(first.shift_id, second.shift_id)}
      >
        {result.status === "loading" ? "Checking…" : "Check overlap"}
      </button>

      <div aria-live="polite">
        {result.status === "error" && (
          <p className="state state--error" role="alert">
            {result.error.message}
          </p>
        )}
        {result.status === "success" && ready && (
          <div className={`verdict ${result.data.exceeds_threshold ? "verdict--over" : "verdict--ok"}`}>
            <p className="verdict__label">
              {result.data.exceeds_threshold ? "Over the limit" : "Within the limit"}
            </p>
            <dl className="verdict__figures">
              <div>
                <dt>Overlap</dt>
                <dd>{formatDuration(result.data.overlap)}</dd>
              </div>
              <div>
                <dt>Allowed</dt>
                <dd>{formatDuration(result.data.max_threshold)}</dd>
              </div>
            </dl>
            <Timeline first={first} second={second} />
          </div>
        )}
      </div>
    </section>
  );
}
