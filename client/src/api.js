const BASE = "/api/v1";

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed with status ${res.status}`);
  }
  return body;
}

export const getShifts = () =>
  request("/question_one_shifts").then((body) => body.data.question_one_shifts);

export const checkOverlap = (shift1, shift2) =>
  request("/overlap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shift1, shift2 }),
  }).then((body) => body.data);

export const getReport = (name) => request(`/${name}`).then((body) => body.result);
