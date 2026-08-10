/** Renders an ISO timestamp (always UTC from the backend) in the browser's own
 * local time zone, date + time -- there's no per-user timezone setting, the
 * browser's timezone is authoritative for display. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Combines a `YYYY-MM-DD` date-picker value with the current wall-clock time --
 * there's no time picker, so the transaction's time-of-day is always "now" at
 * the moment it's recorded, only the date itself is user-chosen (e.g. for
 * backdating). Returns a UTC ISO string for the backend. */
export function dateAtCurrentTime(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const now = new Date();
  return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}
