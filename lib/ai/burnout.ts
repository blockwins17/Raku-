/*
  Burnout / killswitch helpers.  Pure logic — no LLM call needed.
*/
import { PAUSE_MESSAGES, RESUME_MESSAGES } from "./prompts";

/** End of "today" in the caller's local timezone, as an ISO string. */
export function endOfLocalDay(now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function pauseMessage(): string {
  return PAUSE_MESSAGES[
    Math.floor(Math.random() * PAUSE_MESSAGES.length)
  ];
}

export function resumeMessage(): string {
  return RESUME_MESSAGES[
    Math.floor(Math.random() * RESUME_MESSAGES.length)
  ];
}

/** Is `pauseUntil` still in the future? */
export function isPauseActive(pauseUntil: string | null | undefined): boolean {
  if (!pauseUntil) return false;
  const t = Date.parse(pauseUntil);
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

/**
 * Detect "came back after a pause day":
 * pauseUntil is in the past AND was set within the last 48h.
 */
export function isFreshRestart(
  pauseUntil: string | null | undefined,
  updatedAt: string | null | undefined,
): boolean {
  if (!pauseUntil) return false;
  const t = Date.parse(pauseUntil);
  if (Number.isNaN(t) || t >= Date.now()) return false;
  if (!updatedAt) return false;
  const u = Date.parse(updatedAt);
  if (Number.isNaN(u)) return false;
  return Date.now() - u < 48 * 3600 * 1000;
}
