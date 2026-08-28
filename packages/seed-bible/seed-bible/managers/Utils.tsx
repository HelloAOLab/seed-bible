/**
 * The value with surrounding whitespace removed, or null when nothing is left.
 *
 * For anywhere a blank string should behave the same as a missing one. A
 * profile name that arrives as "" or "   " renders as an empty label, which
 * tells a reader less than a fallback does; returning null rather than "" lets
 * the caller reach for `??` and pick its own fallback.
 */
export function trimmedOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Sends a PostHog event, no-op when `posthog` isn't present (SSR, tests). */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (typeof posthog === "undefined" || !posthog) {
    return;
  }
  posthog.capture(eventName, properties);
}
