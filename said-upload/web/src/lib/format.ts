import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isPast,
} from "date-fns";

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Best-effort display name: DB username first, shortened address otherwise.
 * Real ENS resolution can be layered in later (see displayNameForAddress in
 * lib/server/ens.ts) without touching any call site — every component reads
 * through this one function. */
export function displayName(address: string, username?: string | null): string {
  if (username) return username;
  return shortenAddress(address);
}

export function formatDate(iso: string | Date): string {
  return format(new Date(iso), "MMMM d, yyyy");
}

export function formatShortDate(iso: string | Date): string {
  return format(new Date(iso), "MMM d, yy");
}

/** "said 41 days ago" */
export function saidAgo(iso: string | Date): string {
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

/** "104 days left" / "3 days left" / "due today" */
export function daysLeftLabel(deadline: string | Date): string {
  const d = new Date(deadline);
  if (isPast(d)) return "past due";
  const days = differenceInCalendarDays(d, new Date());
  if (days <= 0) return "due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/** "kept 19 days early" / "kept on the last day" / "kept 2 days late" */
export function keptTimingLabel(deadline: string | Date, completedAt: string | Date): string {
  const days = differenceInCalendarDays(new Date(deadline), new Date(completedAt));
  if (days <= 0) return "kept on the last day";
  if (days === 1) return "kept 1 day early";
  return `kept ${days} days early`;
}

export function shortTxHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
