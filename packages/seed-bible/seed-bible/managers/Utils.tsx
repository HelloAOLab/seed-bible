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

/**
 * What to call someone: their profile name, or "User 1a2b3c4d" (the start of
 * their user ID) when they never set one.
 */
export function displayNameOf(
  person: { userId: string; name?: string | null },
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return (
    trimmedOrNull(person.name) ??
    t("unnamed-user", {
      id: person.userId.slice(0, 8),
      defaultValue: "User {{id}}",
    })
  );
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
