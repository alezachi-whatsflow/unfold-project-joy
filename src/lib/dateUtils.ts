/**
 * Centralized date/time formatting for the entire Whatsflow platform.
 * Universal format: DD/MM/YYYY HH:MM
 *
 * Usage:
 *   import { fmtDateTime, fmtDate, fmtTime } from "@/lib/dateUtils";
 *   fmtDateTime("2026-04-01T22:45:00Z")  → "01/04/2026 22:45"
 *   fmtDate("2026-04-01T22:45:00Z")      → "01/04/2026"
 *   fmtTime("2026-04-01T22:45:00Z")      → "22:45"
 */

function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** DD/MM/YYYY HH:MM — universal format */
export function fmtDateTime(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** DD/MM/YYYY — date only */
export function fmtDate(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** HH:MM — time only */
export function fmtTime(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Relative date for chat separators: Hoje / Ontem / DD/MM/YYYY */
export function fmtDateSeparator(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return fmtDate(d);
}

/** DD/MM/YYYY from a "DD/MM/YYYY HH:MM" formatted string (for message grouping) */
export function extractDateFromFormatted(formatted: string): string {
  return (formatted.split(" ")[0] || "").replace(/[,.]$/, "");
}

/** Parse epoch ms from any input (for sorting) */
export function toEpoch(input: string | Date | null | undefined): number {
  const d = toDate(input);
  return d ? d.getTime() : 0;
}
