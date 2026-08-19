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
