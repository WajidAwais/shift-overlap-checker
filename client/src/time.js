const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// The API sends DATE/TIME columns as UTC instants (1970-01-01T22:00Z for
// 22:00), so they must be read in UTC or the browser's offset shifts them.
export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export const dateKey = (iso) => new Date(iso).toISOString().slice(0, 10);

const msIntoDay = (iso) => ((new Date(iso).getTime() % DAY_MS) + DAY_MS) % DAY_MS;

// Mirrors overlap.js on the server: an end before the start runs into the next day.
export function shiftRange(shift) {
  const day = Date.parse(`${dateKey(shift.shift_date)}T00:00:00Z`);
  const start = msIntoDay(shift.start_time);
  const end = msIntoDay(shift.end_time);
  return { start: day + start, end: day + end + (end < start ? DAY_MS : 0) };
}

export const isOvernight = (shift) => msIntoDay(shift.end_time) < msIntoDay(shift.start_time);

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export const durationMinutes = (shift) => {
  const { start, end } = shiftRange(shift);
  return (end - start) / MINUTE_MS;
};
