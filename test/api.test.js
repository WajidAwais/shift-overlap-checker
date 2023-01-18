// API tests against a real PostgreSQL database (DATABASE_URL, migrated with
// `npx prisma migrate deploy`). The database is reset to the demo seed first.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { PrismaClient } = require("@prisma/client");
const { createApp } = require("../app");
const { seed } = require("../prisma/seed");

const skip = process.env.DATABASE_URL ? false : "DATABASE_URL is not set";

describe("HTTP API", { skip }, () => {
  let prisma;
  let app;

  before(async () => {
    prisma = new PrismaClient();
    await seed(prisma);
    app = createApp({ prisma, logFormat: null });
  });

  after(async () => {
    await prisma?.$disconnect();
  });

  const overlap = (body) => request(app).post("/api/v1/overlap").send(body);

  describe("GET /api/v1/question_one_shifts", () => {
    it("lists shifts in date and start-time order with facility names", async () => {
      const res = await request(app).get("/api/v1/question_one_shifts").expect(200);
      const shifts = res.body.data.question_one_shifts;
      assert.equal(res.body.status, "success");
      assert.equal(shifts.length, 10);
      assert.deepEqual(shifts.slice(0, 3).map((s) => s.shift_id), [1, 2, 3]);
      assert.deepEqual(shifts[0], {
        shift_id: 1,
        facility_id: 100,
        shift_date: "2026-03-02T00:00:00.000Z",
        start_time: "1970-01-01T07:00:00.000Z",
        end_time: "1970-01-01T15:00:00.000Z",
        facility: { facility_name: "Cedar Ridge Care Center" },
      });
    });
  });

  describe("POST /api/v1/overlap", () => {
    it("flags 45 minutes at the same facility as over the 30 minute limit", async () => {
      const res = await overlap({ shift1: 1, shift2: 2 }).expect(200);
      assert.deepEqual(res.body, {
        status: "success",
        data: { overlap: 45, max_threshold: 30, exceeds_threshold: true },
      });
    });

    it("reports zero overlap for back-to-back shifts", async () => {
      const res = await overlap({ shift1: 1, shift2: 4 }).expect(200);
      assert.deepEqual(res.body.data, { overlap: 0, max_threshold: 30, exceeds_threshold: false });
    });

    it("uses a zero threshold across facilities", async () => {
      const res = await overlap({ shift1: 2, shift2: 3 }).expect(200);
      assert.deepEqual(res.body.data, { overlap: 430, max_threshold: 0, exceeds_threshold: true });
    });

    it("finds overlap between a night shift and the next morning", async () => {
      const res = await overlap({ shift1: 5, shift2: 6 }).expect(200);
      assert.deepEqual(res.body.data, { overlap: 60, max_threshold: 30, exceeds_threshold: true });
      const reverse = await overlap({ shift1: 9, shift2: 10 }).expect(200);
      assert.deepEqual(reverse.body.data, { overlap: 30, max_threshold: 0, exceeds_threshold: true });
    });

    it("accepts numeric strings as ids", async () => {
      const res = await overlap({ shift1: "7", shift2: "8" }).expect(200);
      assert.equal(res.body.data.overlap, 270);
    });

    for (const [label, body] of [
      ["missing ids", {}],
      ["a non-numeric id", { shift1: "abc", shift2: 2 }],
      ["a fractional id", { shift1: 1.5, shift2: 2 }],
      ["a negative id", { shift1: -1, shift2: 2 }],
    ]) {
      it(`rejects ${label} with 400`, async () => {
        const res = await overlap(body).expect(400);
        assert.equal(res.body.status, "error");
        assert.match(res.body.message, /must be a positive integer/);
      });
    }

    it("rejects comparing a shift with itself", async () => {
      const res = await overlap({ shift1: 3, shift2: 3 }).expect(400);
      assert.equal(res.body.message, "Pick two different shifts");
    });

    it("returns 404 for unknown shifts", async () => {
      const res = await overlap({ shift1: 1, shift2: 999 }).expect(404);
      assert.equal(res.body.message, "Shift not found: 999");
    });

    it("returns 400 for malformed JSON", async () => {
      await request(app)
        .post("/api/v1/overlap")
        .set("Content-Type", "application/json")
        .send("{not json")
        .expect(400);
    });

    it("returns 422 when a stored shift has no times", async () => {
      await prisma.question_one_shifts.create({
        data: { shift_id: 900, facility_id: 100, shift_date: new Date("2026-03-02T00:00:00Z") },
      });
      try {
        const res = await overlap({ shift1: 1, shift2: 900 }).expect(422);
        assert.match(res.body.message, /missing start_time/);
      } finally {
        await prisma.question_one_shifts.delete({ where: { shift_id: 900 } });
      }
    });
  });

  describe("staffing reports", () => {
    it("Q4 sums open spots per facility and nurse type", async () => {
      const res = await request(app).get("/api/v1/q4").expect(200);
      assert.deepEqual(res.body.result, [
        { facility_id: 100, nurse_type_needed: "CNA", total_number_nurses_needed: 3, remaining_spots: 1 },
        { facility_id: 100, nurse_type_needed: "RN", total_number_nurses_needed: 1, remaining_spots: 0 },
        { facility_id: 101, nurse_type_needed: "CNA", total_number_nurses_needed: 2, remaining_spots: 1 },
        { facility_id: 101, nurse_type_needed: "LPN", total_number_nurses_needed: 2, remaining_spots: 1 },
        { facility_id: 102, nurse_type_needed: "LPN", total_number_nurses_needed: 1, remaining_spots: 0 },
        // Two separate RN jobs with the same headcount must be added together.
        { facility_id: 102, nurse_type_needed: "RN", total_number_nurses_needed: 4, remaining_spots: 2 },
      ]);
    });

    it("Q5 counts open jobs each nurse could still take, one row per nurse", async () => {
      const res = await request(app).get("/api/v1/q5").expect(200);
      assert.deepEqual(
        res.body.result.map((r) => [r.nurse_name, r.nurse_type, r.total_remaining_jobs, r.remaining_spots]),
        [
          ["Anne", "CNA", 1, 1],
          ["Bill", "LPN", 0, 0],
          ["Carla", "RN", 2, 2],
          ["Dev", "CNA", 1, 1],
          ["Elena", "RN", 1, 1],
          ["Farid", "LPN", 1, 1],
          ["Grace", "CNA", 1, 1],
          ["Hugo", "RN", 1, 1],
        ],
      );
    });

    it("Q6 lists Anne's coworkers by default", async () => {
      const res = await request(app).get("/api/v1/q6").expect(200);
      assert.deepEqual(res.body, {
        nurse: "Anne",
        result: [{ nurse_name: "Carla" }, { nurse_name: "Dev" }],
      });
    });

    it("Q6 accepts another nurse and binds the name as a parameter", async () => {
      const res = await request(app).get("/api/v1/q6").query({ nurse: "Hugo" }).expect(200);
      assert.deepEqual(res.body.result, [{ nurse_name: "Elena" }, { nurse_name: "Farid" }]);
      const injected = await request(app).get("/api/v1/q6").query({ nurse: "x' OR '1'='1" }).expect(200);
      assert.deepEqual(injected.body.result, []);
    });
  });

  it("answers unknown API routes with a JSON 404", async () => {
    const res = await request(app).get("/api/v1/nope").expect(404);
    assert.equal(res.body.status, "error");
  });
});
