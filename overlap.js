const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SAME_FACILITY_THRESHOLD_MINUTES = 30;

// Prisma returns DATE and TIME columns as JS Dates pinned to UTC
// (DATE -> yyyy-mm-ddT00:00Z, TIME -> 1970-01-01Thh:mmZ). Every calculation
// below therefore uses UTC fields, so the result never depends on the
// server's TZ setting.
function toDate(value, label) {
  if (value === null || value === undefined) {
    throw new TypeError(`Shift is missing ${label}`);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Shift has an invalid ${label}`);
  }
  return date;
}

function msIntoDay(date) {
  return ((date.getTime() % DAY_MS) + DAY_MS) % DAY_MS;
}

function utcMidnight(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// A shift whose end time is earlier than its start time runs past midnight
// into the next day. Equal start and end times mean a zero-length shift.
function shiftInterval(shift) {
  const day = utcMidnight(toDate(shift.shift_date, "shift_date"));
  const startOfDay = msIntoDay(toDate(shift.start_time, "start_time"));
  const endOfDay = msIntoDay(toDate(shift.end_time, "end_time"));
  const start = day + startOfDay;
  const end = day + endOfDay + (endOfDay < startOfDay ? DAY_MS : 0);
  return { start, end };
}

function getOverlapMinutes(shiftA, shiftB) {
  const a = shiftInterval(shiftA);
  const b = shiftInterval(shiftB);
  const overlapMs = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  return overlapMs > 0 ? overlapMs / MINUTE_MS : 0;
}

function maxOverlapThreshold(shiftA, shiftB) {
  const sameFacility =
    shiftA.facility_id !== null &&
    shiftA.facility_id !== undefined &&
    shiftA.facility_id === shiftB.facility_id;
  return sameFacility ? SAME_FACILITY_THRESHOLD_MINUTES : 0;
}

function compareShifts(shiftA, shiftB) {
  const overlap = getOverlapMinutes(shiftA, shiftB);
  const maxThreshold = maxOverlapThreshold(shiftA, shiftB);
  return {
    overlap,
    max_threshold: maxThreshold,
    exceeds_threshold: overlap > maxThreshold,
  };
}

module.exports = {
  compareShifts,
  getOverlapMinutes,
  maxOverlapThreshold,
  shiftInterval,
};
