import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

const shift = (id, date, start, end, facility = "Cedar Ridge") => ({
  shift_id: id,
  facility_id: 100,
  shift_date: `${date}T00:00:00.000Z`,
  start_time: `1970-01-01T${start}:00.000Z`,
  end_time: `1970-01-01T${end}:00.000Z`,
  facility: { facility_name: facility },
});

const shifts = [
  shift(1, "2026-03-02", "22:00", "06:00"),
  shift(2, "2026-03-03", "05:00", "13:00"),
  shift(3, "2026-03-03", "14:00", "22:00", "Harborview"),
];

const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

let routes;
beforeEach(() => {
  routes = {
    "/api/v1/question_one_shifts": () => json({ status: "success", data: { question_one_shifts: shifts } }),
    "/api/v1/overlap": () => json({ status: "success", data: { overlap: 60, max_threshold: 30, exceeds_threshold: true } }),
    "/api/v1/q4": () =>
      json({ result: [{ facility_id: 100, nurse_type_needed: "RN", total_number_nurses_needed: 4, remaining_spots: 2 }] }),
    "/api/v1/q5": () => json({ result: [] }),
    "/api/v1/q6?nurse=Hugo": () => json({ nurse: "Hugo", result: [{ nurse_name: "Elena" }] }),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => (routes[url] ? routes[url]() : json({ status: "error", message: "Not found" }, 404))),
  );
});

const card = (name) => screen.findByRole("button", { name: new RegExp(name) });

describe("shift board", () => {
  it("shows stored wall-clock times grouped by date, flagging overnight shifts", async () => {
    render(<App />);
    const night = await card("22:00 to 06:00");
    expect(within(night).getByText("overnight")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mon 2 Mar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tue 3 Mar" })).toBeInTheDocument();
  });

  it("shows a loading state, then an error with a retry", async () => {
    routes["/api/v1/question_one_shifts"] = () => json({ status: "error", message: "Internal server error" }, 500);
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("Loading shifts…")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load shifts: Internal server error");
    routes["/api/v1/question_one_shifts"] = () => json({ data: { question_one_shifts: shifts } });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await card("22:00 to 06:00")).toBeInTheDocument();
  });

  it("shows an empty state when there are no shifts", async () => {
    routes["/api/v1/question_one_shifts"] = () => json({ data: { question_one_shifts: [] } });
    render(<App />);
    expect(await screen.findByText(/No shifts yet/)).toBeInTheDocument();
  });
});

describe("comparing shifts", () => {
  it("keeps at most two selections, replacing the older one", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await card("22:00 to 06:00"));
    await user.click(await card("05:00 to 13:00"));
    await user.click(await card("14:00 to 22:00"));
    expect(await card("22:00 to 06:00")).toHaveAttribute("aria-pressed", "false");
    expect(await card("05:00 to 13:00")).toHaveAttribute("aria-pressed", "true");
    expect(await card("14:00 to 22:00")).toHaveAttribute("aria-pressed", "true");
  });

  it("only enables the check once two shifts are picked, then shows the verdict", async () => {
    const user = userEvent.setup();
    render(<App />);
    // The panel remounts on every selection change, so re-query the button.
    const check = () => screen.getByRole("button", { name: "Check overlap" });
    expect(check()).toBeDisabled();
    await user.click(await card("22:00 to 06:00"));
    expect(check()).toBeDisabled();
    await user.click(await card("05:00 to 13:00"));
    expect(check()).toBeEnabled();
    await user.click(check());
    expect(await screen.findByText("Over the limit")).toBeInTheDocument();
    expect(screen.getByText("1 h")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "Timeline of the two shifts" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/overlap",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ shift1: 1, shift2: 2 }) }),
    );
  });

  it("clears the verdict when the selection changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await card("22:00 to 06:00"));
    await user.click(await card("05:00 to 13:00"));
    await user.click(screen.getByRole("button", { name: "Check overlap" }));
    await screen.findByText("Over the limit");
    await user.click(await card("05:00 to 13:00"));
    expect(screen.queryByText("Over the limit")).not.toBeInTheDocument();
  });

  it("shows the API error message", async () => {
    routes["/api/v1/overlap"] = () => json({ status: "error", message: "Shift not found: 2" }, 404);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await card("22:00 to 06:00"));
    await user.click(await card("05:00 to 13:00"));
    await user.click(screen.getByRole("button", { name: "Check overlap" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Shift not found: 2");
  });
});

describe("staffing reports", () => {
  it("renders a report as a table", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open spots" }));
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("100RN42");
  });

  it("shows an empty state for a report without rows", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Jobs per nurse" }));
    expect(await screen.findByText("No rows for this report.")).toBeInTheDocument();
  });

  it("looks up coworkers for a typed nurse name", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Coworkers" }));
    const input = screen.getByLabelText("Nurse name");
    await user.clear(input);
    await user.type(input, "Hugo");
    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(await screen.findByRole("cell", { name: "Elena" })).toBeInTheDocument();
  });
});
