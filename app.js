require("dotenv").config();
const getOverlap = require("./overlap");
const express = require("express");
const morgan = require("morgan");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const app = express();

app.use(morgan("dev"));

app.use(express.json());

const bodyParser = require("body-parser");

app.use(bodyParser.json());

const cors = require("cors");
app.use(cors());

app.get("/api/v1/question_one_shifts", async (req, res) => {
  try {
    const question_one_shifts = await prisma.question_one_shifts.findMany({
      include: {
        facility: {
          select: {
            facility_name: true,
          },
        },
      },
    });
    res.status(200).json({
      status: "success",
      data: {
        question_one_shifts: question_one_shifts,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

app.post("/api/v1/overlap", async (req, res) => {
  try {
    var overlap = 0;
    const question_one_shifts = await prisma.question_one_shifts.findUnique({
      where: {
        shift_id: req.body.shift1,
      },
    });
    const question_one_shifts2 = await prisma.question_one_shifts.findUnique({
      where: {
        shift_id: req.body.shift2,
      },
    });

    if (
      question_one_shifts.shift_date.getTime() ===
      question_one_shifts2.shift_date.getTime()
    ) {
      overlap = getOverlap(question_one_shifts, question_one_shifts2);
    }
    const max_threshold =
      question_one_shifts.facility_id == question_one_shifts2.facility_id
        ? 30
        : 0;
    res.status(200).json({
      status: "success",
      data: {
        overlap: overlap,
        max_threshold: max_threshold,
        exceeds_threshold: overlap > max_threshold,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

app.get("/api/v1/q4", async function (req, res) {
  try {
    const result =
      await prisma.$queryRaw`SELECT facilities.facility_id, jobs.nurse_type_needed, jobs.total_number_nurses_needed, (jobs.total_number_nurses_needed - COUNT(nurse_hired_jobs.nurse_id)) AS remaining_spots
                                            FROM facilities
                                            JOIN jobs ON facilities.facility_id = jobs.facility_id
                                            LEFT JOIN nurse_hired_jobs ON jobs.job_id = nurse_hired_jobs.job_id
                                            GROUP BY facilities.facility_id, jobs.nurse_type_needed, jobs.total_number_nurses_needed
                                            ORDER BY facilities.facility_id, jobs.nurse_type_needed;`;
    for (var i = 0; i < result.length; i++) {
      result[i].remaining_spots = parseInt(result[i].remaining_spots);
    }

    res.status(200).json({
      result: result,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

app.get("/api/v1/q5", async function (req, res) {
  try {
    const result = await prisma.$queryRaw`SELECT
                                              nurses.nurse_id,
                                              nurses.nurse_name,
                                              nurses.nurse_type,
                                              COUNT(DISTINCT job_remaining.job_id) AS total_remaining_jobs,
                                              SUM(job_remaining.remaining_spots) AS remaining_spots
                                          FROM nurses
                                          LEFT JOIN (
                                              SELECT
                                                  jobs.job_id,
                                                  jobs.nurse_type_needed ,
                                                  jobs.total_number_nurses_needed ,
                                                  (jobs.total_number_nurses_needed  - COUNT(DISTINCT nurse_hired_jobs.nurse_id)) AS remaining_spots
                                              FROM jobs
                                              LEFT JOIN nurse_hired_jobs ON jobs.job_id = nurse_hired_jobs.job_id
                                              GROUP BY jobs.job_id, jobs.nurse_type_needed , jobs.total_number_nurses_needed
                                          ) job_remaining ON nurses.nurse_type = job_remaining.nurse_type_needed
                                          LEFT JOIN nurse_hired_jobs ON nurses.nurse_id = nurse_hired_jobs.nurse_id AND job_remaining.job_id = nurse_hired_jobs.job_id
                                          WHERE nurse_hired_jobs.nurse_id IS NULL
                                          GROUP BY nurses.nurse_id, nurses.nurse_name, nurses.nurse_type, remaining_spots
                                          ORDER BY nurses.nurse_id`;
    for (var i = 0; i < result.length; i++) {
      result[i].total_remaining_jobs = parseInt(result[i].total_remaining_jobs);
    }
    res.status(200).json({
      result: result,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

app.get("/api/v1/q6", async function (req, res) {
  try {
    const result = await prisma.$queryRaw`SELECT nurses.nurse_name
                                          FROM nurses
                                          JOIN nurse_hired_jobs ON nurses.nurse_id = nurse_hired_jobs.nurse_id
                                          JOIN jobs ON nurse_hired_jobs.job_id = jobs.job_id
                                          WHERE nurses.nurse_name != 'Anne' AND jobs.facility_id IN (
                                            SELECT facility_id
                                            FROM jobs
                                            JOIN nurse_hired_jobs ON jobs.job_id = nurse_hired_jobs.job_id
                                            JOIN nurses ON nurse_hired_jobs.nurse_id = nurses.nurse_id
                                            WHERE nurses.nurse_name = 'Anne'
                                          )
                                          GROUP BY nurses.nurse_name;`;
    res.status(200).json({
      result: result,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
