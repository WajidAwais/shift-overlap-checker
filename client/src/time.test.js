import { describe, it, expect } from "vitest";
import { durationMinutes, formatDuration, formatTime, isOvernight, shiftRange } from "./time";

const shift = (date, start, end) => ({
  shift_date: `${date}T00:00:00.000Z`,
  start_time: `1970-01-01T${start}:00.000Z`,
  end_time: `1970-01-01T${end}:00.000Z`,
});

describe("time helpers", () => {
  it("formats stored times in UTC", () => {
    expect(formatTime("1970-01-01T22:00:00.000Z")).toBe("22:00");
  });

  it("extends overnight shifts into the next day", () => {
    const night = shift("2026-03-02", "22:00", "06:00");
    expect(isOvernight(night)).toBe(true);
    expect(shiftRange(night)).toEqual({ start: Date.UTC(2026, 2, 2, 22), end: Date.UTC(2026, 2, 3, 6) });
    expect(durationMinutes(night)).toBe(480);
  });

  it("treats equal start and end as zero length", () => {
    const empty = shift("2026-03-02", "12:00", "12:00");
    expect(isOvernight(empty)).toBe(false);
    expect(durationMinutes(empty)).toBe(0);
  });

  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(430)).toBe("7 h 10 min");
  });
});
