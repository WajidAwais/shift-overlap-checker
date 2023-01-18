import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

const shifts = [
  { shift_id: 1, facility_id: 100, shift_date: "2026-03-02T00:00:00.000Z", start_time: "1970-01-01T22:00:00.000Z", end_time: "1970-01-01T06:00:00.000Z", facility: { facility_name: "Cedar Ridge" } },
  { shift_id: 2, facility_id: 100, shift_date: "2026-03-03T00:00:00.000Z", start_time: "1970-01-01T05:00:00.000Z", end_time: "1970-01-01T13:00:00.000Z", facility: { facility_name: "Cedar Ridge" } },
];

const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn((url) => {
    if (url.endsWith("/question_one_shifts")) return json({ data: { question_one_shifts: shifts } });
    if (url.endsWith("/overlap")) return json({ data: { overlap: 60, max_threshold: 30, exceeds_threshold: true } });
    return json({ message: "nope" }, 404);
  }));
});

describe("App", () => {
  it("shows shift times as stored, independent of the browser timezone", async () => {
    render(<App />);
    expect(await screen.findByText(/22:00 - 06:00/)).toBeInTheDocument();
  });

  it("compares two selected shifts", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByText(/22:00 - 06:00/));
    await user.click(screen.getByText(/05:00 - 13:00/));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("Overlap Minutes: 60")).toBeInTheDocument();
    expect(within(document.body).getByText("Exceed Overlap Threshold: true")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/v1/overlap", expect.objectContaining({ method: "POST", body: JSON.stringify({ shift1: 1, shift2: 2 }) }));
  });
});
