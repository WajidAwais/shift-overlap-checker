// Fictional demo data: facility and nurse names are made up.
const { PrismaClient } = require("@prisma/client");

const time = (hhmm) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const date = (ymd) => new Date(`${ymd}T00:00:00.000Z`);

const facilities = [
  { facility_id: 100, facility_name: "Cedar Ridge Care Center" },
  { facility_id: 101, facility_name: "Harborview Rehab" },
  { facility_id: 102, facility_name: "Maple Street Clinic" },
];

const nurses = [
  { nurse_id: 1001, nurse_name: "Anne", nurse_type: "CNA" },
  { nurse_id: 1002, nurse_name: "Bill", nurse_type: "LPN" },
  { nurse_id: 1003, nurse_name: "Carla", nurse_type: "RN" },
  { nurse_id: 1004, nurse_name: "Dev", nurse_type: "CNA" },
  { nurse_id: 1005, nurse_name: "Elena", nurse_type: "RN" },
  { nurse_id: 1006, nurse_name: "Farid", nurse_type: "LPN" },
  { nurse_id: 1007, nurse_name: "Grace", nurse_type: "CNA" },
  { nurse_id: 1008, nurse_name: "Hugo", nurse_type: "RN" },
];

const jobs = [
  { job_id: 501, facility_id: 100, nurse_type_needed: "CNA", total_number_nurses_needed: 3 },
  { job_id: 502, facility_id: 100, nurse_type_needed: "RN", total_number_nurses_needed: 1 },
  { job_id: 503, facility_id: 101, nurse_type_needed: "CNA", total_number_nurses_needed: 2 },
  { job_id: 504, facility_id: 101, nurse_type_needed: "LPN", total_number_nurses_needed: 2 },
  { job_id: 505, facility_id: 102, nurse_type_needed: "RN", total_number_nurses_needed: 2 },
  { job_id: 506, facility_id: 102, nurse_type_needed: "RN", total_number_nurses_needed: 2 },
  { job_id: 507, facility_id: 102, nurse_type_needed: "LPN", total_number_nurses_needed: 1 },
];

const hires = [
  { job_id: 501, nurse_id: 1001 },
  { job_id: 501, nurse_id: 1004 },
  { job_id: 502, nurse_id: 1003 },
  { job_id: 503, nurse_id: 1007 },
  { job_id: 504, nurse_id: 1002 },
  { job_id: 505, nurse_id: 1005 },
  { job_id: 506, nurse_id: 1008 },
  { job_id: 507, nurse_id: 1006 },
];

const shifts = [
  [1, 100, "2026-03-02", "07:00", "15:00"],
  [2, 100, "2026-03-02", "14:15", "22:00"],
  [3, 101, "2026-03-02", "14:50", "23:00"],
  [4, 100, "2026-03-02", "15:00", "23:00"],
  [5, 102, "2026-03-02", "22:00", "06:00"],
  [6, 102, "2026-03-03", "05:00", "13:00"],
  [7, 101, "2026-03-03", "06:00", "14:00"],
  [8, 100, "2026-03-03", "09:30", "17:30"],
  [9, 102, "2026-03-03", "19:00", "07:00"],
  [10, 101, "2026-03-04", "06:30", "12:00"],
].map(([shift_id, facility_id, day, start, end]) => ({
  shift_id,
  facility_id,
  shift_date: date(day),
  start_time: time(start),
  end_time: time(end),
}));

async function seed(prisma) {
  await prisma.$transaction([
    prisma.question_one_shifts.deleteMany(),
    prisma.nurse_hired_jobs.deleteMany(),
    prisma.jobs.deleteMany(),
    prisma.nurses.deleteMany(),
    prisma.facilities.deleteMany(),
    prisma.facilities.createMany({ data: facilities }),
    prisma.nurses.createMany({ data: nurses }),
    prisma.jobs.createMany({ data: jobs }),
    prisma.nurse_hired_jobs.createMany({ data: hires }),
    prisma.question_one_shifts.createMany({ data: shifts }),
  ]);
}

module.exports = { seed };

if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => console.log(`Seeded ${shifts.length} shifts, ${nurses.length} nurses, ${jobs.length} jobs`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
