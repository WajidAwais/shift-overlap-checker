// The API sends DATE/TIME columns as UTC instants (1970-01-01T22:00Z for
// 22:00), so they must be formatted in UTC or the browser's offset shifts them.
export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export const formatDate = (iso) => new Date(iso).toISOString().slice(0, 10);
