const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { compareShifts } = require("./overlap");
const reports = require("./reports");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseShiftId(value, field) {
  const id = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, `${field} must be a positive integer shift id`);
  }
  return id;
}

function createApp({ prisma, clientDir, logFormat = "dev" }) {
  const app = express();

  if (logFormat) app.use(morgan(logFormat));
  app.use(cors());
  app.use(express.json());

  const api = express.Router();

  api.get("/question_one_shifts", async (req, res) => {
    const shifts = await prisma.question_one_shifts.findMany({
      include: { facility: { select: { facility_name: true } } },
      orderBy: [{ shift_date: "asc" }, { start_time: "asc" }, { shift_id: "asc" }],
    });
    res.json({ status: "success", data: { question_one_shifts: shifts } });
  });

  api.post("/overlap", async (req, res) => {
    const body = req.body ?? {};
    const shift1 = parseShiftId(body.shift1, "shift1");
    const shift2 = parseShiftId(body.shift2, "shift2");
    if (shift1 === shift2) {
      throw new HttpError(400, "Pick two different shifts");
    }

    const found = await prisma.question_one_shifts.findMany({
      where: { shift_id: { in: [shift1, shift2] } },
    });
    const first = found.find((s) => s.shift_id === shift1);
    const second = found.find((s) => s.shift_id === shift2);
    const missing = [first ? null : shift1, second ? null : shift2].filter(Boolean);
    if (missing.length > 0) {
      throw new HttpError(404, `Shift not found: ${missing.join(", ")}`);
    }

    let result;
    try {
      result = compareShifts(first, second);
    } catch (err) {
      throw new HttpError(422, err.message);
    }
    res.json({ status: "success", data: result });
  });

  api.get("/q4", async (req, res) => {
    res.json({ result: await reports.openSpotsByFacility(prisma) });
  });

  api.get("/q5", async (req, res) => {
    res.json({ result: await reports.openJobsPerNurse(prisma) });
  });

  api.get("/q6", async (req, res) => {
    const nurse = typeof req.query.nurse === "string" && req.query.nurse.trim() ? req.query.nurse.trim() : "Anne";
    res.json({ nurse, result: await reports.coworkersOf(prisma, nurse) });
  });

  api.use((req, res) => {
    res.status(404).json({ status: "error", message: "Not found" });
  });

  app.use("/api/v1", api);

  if (clientDir && fs.existsSync(path.join(clientDir, "index.html"))) {
    app.use(express.static(clientDir));
  }

  // Express 5 forwards rejected promises from async handlers here.
  app.use((err, req, res, _next) => {
    const status = err.status ?? err.statusCode ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      status: "error",
      message: status >= 500 ? "Internal server error" : err.message,
    });
  });

  return app;
}

module.exports = { createApp, HttpError };
