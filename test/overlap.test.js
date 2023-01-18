const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  compareShifts,
  getOverlapMinutes,
  maxOverlapThreshold,
  shiftInterval,
} = require("../overlap");

// Builds a shift the way Prisma hands it back from Postgres DATE/TIME columns.
function shift(date, start, end, facilityId = 1) {
  return {
    facility_id: facilityId,
    shift_date: new Date(`${date}T00:00:00.000Z`),
    start_time: new Date(`1970-01-01T${start}:00.000Z`),
    end_time: new Date(`1970-01-01T${end}:00.000Z`),
  };
}

describe("getOverlapMinutes", () => {
  it("returns the shared minutes of two partly overlapping shifts", () => {
    const a = shift("2026-03-02", "07:00", "15:00");
    const b = shift("2026-03-02", "14:15", "22:00");
    assert.equal(getOverlapMinutes(a, b), 45);
    assert.equal(getOverlapMinutes(b, a), 45);
  });

  it("returns 0 for shifts that only touch at a boundary", () => {
    const a = shift("2026-03-02", "07:00", "15:00");
    const b = shift("2026-03-02", "15:00", "23:00");
    assert.equal(getOverlapMinutes(a, b), 0);
    assert.equal(getOverlapMinutes(b, a), 0);
  });

  it("returns 0 for disjoint shifts on the same day", () => {
    const a = shift("2026-03-02", "06:00", "10:00");
    const b = shift("2026-03-02", "12:00", "16:00");
    assert.equal(getOverlapMinutes(a, b), 0);
  });

  it("returns the full length for identical shifts", () => {
    const a = shift("2026-03-02", "09:30", "17:00");
    assert.equal(getOverlapMinutes(a, { ...a }), 450);
  });

  it("returns the inner shift length when one contains the other", () => {
    const outer = shift("2026-03-02", "08:00", "20:00");
    const inner = shift("2026-03-02", "10:00", "11:30");
    assert.equal(getOverlapMinutes(outer, inner), 90);
  });

  it("returns 0 for shifts on different days with the same hours", () => {
    const a = shift("2026-03-02", "09:00", "17:00");
    const b = shift("2026-03-03", "09:00", "17:00");
    assert.equal(getOverlapMinutes(a, b), 0);
  });

  describe("shifts across midnight", () => {
    it("treats an end time before the start time as the next day", () => {
      const night = shift("2026-03-02", "22:00", "06:00");
      assert.deepEqual(shiftInterval(night), {
        start: Date.UTC(2026, 2, 2, 22),
        end: Date.UTC(2026, 2, 3, 6),
      });
    });

    it("overlaps a late evening shift on the same date", () => {
      const night = shift("2026-03-02", "22:00", "06:00");
      const evening = shift("2026-03-02", "18:00", "23:30");
      assert.equal(getOverlapMinutes(night, evening), 90);
    });

    it("overlaps an early shift on the following date", () => {
      const night = shift("2026-03-02", "22:00", "06:00");
      const early = shift("2026-03-03", "05:00", "13:00");
      assert.equal(getOverlapMinutes(night, early), 60);
      assert.equal(getOverlapMinutes(early, night), 60);
    });

    it("does not overlap an early shift on its own start date", () => {
      const night = shift("2026-03-02", "22:00", "06:00");
      const early = shift("2026-03-02", "05:00", "13:00");
      assert.equal(getOverlapMinutes(night, early), 0);
    });

    it("compares two overnight shifts", () => {
      const a = shift("2026-03-02", "20:00", "04:00");
      const b = shift("2026-03-02", "23:00", "07:00");
      assert.equal(getOverlapMinutes(a, b), 300);
    });

    it("handles a shift that ends exactly at midnight", () => {
      const evening = shift("2026-03-02", "16:00", "00:00");
      const night = shift("2026-03-03", "00:00", "08:00");
      assert.equal(getOverlapMinutes(evening, night), 0);
      const late = shift("2026-03-02", "23:00", "23:45");
      assert.equal(getOverlapMinutes(evening, late), 45);
    });

    it("crosses month and year ends", () => {
      const nye = shift("2025-12-31", "21:00", "03:00");
      const newYear = shift("2026-01-01", "01:00", "09:00");
      assert.equal(getOverlapMinutes(nye, newYear), 120);
    });
  });

  describe("zero-length shifts", () => {
    it("never overlaps anything, even inside another shift", () => {
      const empty = shift("2026-03-02", "12:00", "12:00");
      const day = shift("2026-03-02", "08:00", "16:00");
      assert.equal(getOverlapMinutes(empty, day), 0);
      assert.equal(getOverlapMinutes(day, empty), 0);
    });

    it("does not overlap itself", () => {
      const empty = shift("2026-03-02", "12:00", "12:00");
      assert.equal(getOverlapMinutes(empty, empty), 0);
    });
  });

  it("keeps sub-minute precision from TIME(6) columns", () => {
    const a = shift("2026-03-02", "08:00", "09:00");
    const b = {
      ...shift("2026-03-02", "08:00", "09:00"),
      start_time: new Date("1970-01-01T08:59:30.000Z"),
    };
    assert.equal(getOverlapMinutes(a, b), 0.5);
  });

  it("accepts ISO strings as well as Date objects", () => {
    const a = {
      shift_date: "2026-03-02T00:00:00.000Z",
      start_time: "1970-01-01T09:00:00.000Z",
      end_time: "1970-01-01T10:00:00.000Z",
    };
    assert.equal(getOverlapMinutes(a, shift("2026-03-02", "09:30", "12:00")), 30);
  });

  it("rejects shifts with missing or invalid times", () => {
    const ok = shift("2026-03-02", "08:00", "16:00");
    assert.throws(() => getOverlapMinutes({ ...ok, end_time: null }, ok), /missing end_time/);
    assert.throws(() => getOverlapMinutes(ok, { ...ok, shift_date: null }), /missing shift_date/);
    assert.throws(() => getOverlapMinutes({ ...ok, start_time: "nope" }, ok), /invalid start_time/);
  });
});

describe("timezones", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  for (const tz of ["UTC", "America/Los_Angeles", "Asia/Kolkata", "Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
    it(`gives the same answers with TZ=${tz}`, () => {
      process.env.TZ = tz;
      const night = shift("2026-03-07", "22:00", "06:00");
      const early = shift("2026-03-08", "05:00", "13:00");
      assert.equal(getOverlapMinutes(night, early), 60);
      assert.equal(getOverlapMinutes(night, shift("2026-03-08", "06:00", "14:00")), 0);
      assert.equal(getOverlapMinutes(night, shift("2026-03-07", "05:00", "13:00")), 0);
    });
  }

  it("is unaffected by a daylight-saving change on the shift night", () => {
    process.env.TZ = "America/New_York";
    // 2026-03-08 is the US spring-forward date; the stored times are
    // wall-clock values, so an 8-hour night shift stays 8 hours long.
    const night = shift("2026-03-07", "22:00", "06:00");
    const { start, end } = shiftInterval(night);
    assert.equal((end - start) / 60000, 480);
  });
});

describe("maxOverlapThreshold", () => {
  it("allows 30 minutes at the same facility", () => {
    assert.equal(maxOverlapThreshold({ facility_id: 2 }, { facility_id: 2 }), 30);
  });

  it("allows nothing across facilities", () => {
    assert.equal(maxOverlapThreshold({ facility_id: 2 }, { facility_id: 3 }), 0);
  });

  it("does not treat two shifts without a facility as the same facility", () => {
    assert.equal(maxOverlapThreshold({ facility_id: null }, { facility_id: null }), 0);
  });
});

describe("compareShifts", () => {
  it("flags overlap above the same-facility threshold", () => {
    const a = shift("2026-03-02", "07:00", "15:00", 1);
    const b = shift("2026-03-02", "14:00", "22:00", 1);
    assert.deepEqual(compareShifts(a, b), {
      overlap: 60,
      max_threshold: 30,
      exceeds_threshold: true,
    });
  });

  it("does not flag overlap exactly at the threshold", () => {
    const a = shift("2026-03-02", "07:00", "15:00", 1);
    const b = shift("2026-03-02", "14:30", "22:00", 1);
    assert.equal(compareShifts(a, b).exceeds_threshold, false);
  });

  it("flags any overlap across facilities", () => {
    const a = shift("2026-03-02", "07:00", "15:00", 1);
    const b = shift("2026-03-02", "14:59", "22:00", 2);
    const result = compareShifts(a, b);
    assert.equal(result.max_threshold, 0);
    assert.equal(result.exceeds_threshold, true);
  });

  it("does not flag touching shifts across facilities", () => {
    const a = shift("2026-03-02", "07:00", "15:00", 1);
    const b = shift("2026-03-02", "15:00", "22:00", 2);
    assert.equal(compareShifts(a, b).exceeds_threshold, false);
  });
});
