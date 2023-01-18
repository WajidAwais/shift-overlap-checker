// Staffing reports (questions 4-6 of the original exercise). COUNT and SUM
// come back from Postgres as bigint/numeric, so they are cast to int in SQL
// to keep the JSON plain numbers.

// Q4: open spots per facility and nurse type. Hires are counted per job in a
// subquery first, so two jobs with the same facility, type and headcount are
// summed rather than collapsed into one row.
function openSpotsByFacility(prisma) {
  return prisma.$queryRaw`
    SELECT jobs.facility_id,
           jobs.nurse_type_needed,
           SUM(jobs.total_number_nurses_needed)::int AS total_number_nurses_needed,
           (SUM(jobs.total_number_nurses_needed) - SUM(COALESCE(hired.count, 0)))::int AS remaining_spots
    FROM jobs
    LEFT JOIN (
      SELECT job_id, COUNT(*) AS count FROM nurse_hired_jobs GROUP BY job_id
    ) hired ON hired.job_id = jobs.job_id
    GROUP BY jobs.facility_id, jobs.nurse_type_needed
    ORDER BY jobs.facility_id, jobs.nurse_type_needed`;
}

// Q5: for every nurse, the jobs of their type that still have open spots and
// that they have not already been hired for.
function openJobsPerNurse(prisma) {
  return prisma.$queryRaw`
    SELECT nurses.nurse_id,
           nurses.nurse_name,
           nurses.nurse_type,
           COUNT(open_jobs.job_id)::int AS total_remaining_jobs,
           COALESCE(SUM(open_jobs.remaining_spots), 0)::int AS remaining_spots
    FROM nurses
    LEFT JOIN (
      SELECT jobs.job_id,
             jobs.nurse_type_needed,
             jobs.total_number_nurses_needed - COUNT(nurse_hired_jobs.nurse_id) AS remaining_spots
      FROM jobs
      LEFT JOIN nurse_hired_jobs ON nurse_hired_jobs.job_id = jobs.job_id
      GROUP BY jobs.job_id
    ) open_jobs
      ON open_jobs.nurse_type_needed = nurses.nurse_type
     AND open_jobs.remaining_spots > 0
     AND NOT EXISTS (
       SELECT 1 FROM nurse_hired_jobs
       WHERE nurse_hired_jobs.job_id = open_jobs.job_id
         AND nurse_hired_jobs.nurse_id = nurses.nurse_id
     )
    GROUP BY nurses.nurse_id, nurses.nurse_name, nurses.nurse_type
    ORDER BY nurses.nurse_id`;
}

// Q6: nurses hired at any facility where the given nurse has been hired.
function coworkersOf(prisma, nurseName) {
  return prisma.$queryRaw`
    SELECT DISTINCT nurses.nurse_name
    FROM nurses
    JOIN nurse_hired_jobs ON nurse_hired_jobs.nurse_id = nurses.nurse_id
    JOIN jobs ON jobs.job_id = nurse_hired_jobs.job_id
    WHERE nurses.nurse_name <> ${nurseName}
      AND jobs.facility_id IN (
        SELECT jobs.facility_id
        FROM jobs
        JOIN nurse_hired_jobs ON nurse_hired_jobs.job_id = jobs.job_id
        JOIN nurses ON nurses.nurse_id = nurse_hired_jobs.nurse_id
        WHERE nurses.nurse_name = ${nurseName}
      )
    ORDER BY nurses.nurse_name`;
}

module.exports = { openSpotsByFacility, openJobsPerNurse, coworkersOf };
