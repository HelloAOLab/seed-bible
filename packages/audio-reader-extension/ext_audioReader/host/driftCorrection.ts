/**
 * Keeps a listener's recording in step with the host's by nudging its
 * playback speed, and jumping only when it's too far off to catch up
 * smoothly. Browsers keep the pitch when the speed changes, so a few percent
 * is not noticeable on narration.
 */

/** Further off than this, in seconds, and it jumps instead of catching up. */
export const DRIFT_SEEK_SECONDS = 1;
/** In step to within this, in seconds, and nothing is changed. */
export const DRIFT_START_NUDGE_SECONDS = 0.08;
/** Once nudging, back to normal speed when this close, in seconds. */
export const DRIFT_SETTLED_SECONDS = 0.02;
/** Furthest from normal speed a nudge goes: 0.95× to 1.05×. */
export const DRIFT_MAX_RATE_OFFSET = 0.05;
/**
 * Speed change per second of drift: half a second off nudges by the full
 * 5%, which closes it in about ten seconds.
 */
const DRIFT_RATE_GAIN = 0.1;
/**
 * Least time between speed changes. Some Safari versions glitch briefly on
 * each change, so it changes in steps rather than continuously.
 */
export const DRIFT_RATE_CHANGE_INTERVAL_MS = 1000;
/**
 * Least time between jumps. A jump into audio that hasn't loaded yet leaves
 * it behind again while it buffers; jumping again at once would chase it.
 */
export const DRIFT_SEEK_COOLDOWN_MS = 3000;

export interface DriftState {
  /** The speed the player is set to now. */
  rate: number;
  lastRateChangeMs: number;
  lastSeekMs: number;
}

export type DriftDecision =
  | { kind: "hold" }
  | { kind: "rate"; rate: number }
  | { kind: "seek" };

export function initialDriftState(): DriftState {
  return {
    rate: 1,
    lastRateChangeMs: Number.NEGATIVE_INFINITY,
    lastSeekMs: Number.NEGATIVE_INFINITY,
  };
}

/**
 * What to do about a listener `driftSeconds` ahead of where the host's audio
 * should be (negative when behind), at `nowMs` on any steady clock.
 */
export function decideDriftCorrection(
  driftSeconds: number,
  state: DriftState,
  nowMs: number
): DriftDecision {
  const off = Math.abs(driftSeconds);

  if (off > DRIFT_SEEK_SECONDS) {
    if (nowMs - state.lastSeekMs >= DRIFT_SEEK_COOLDOWN_MS) {
      return { kind: "seek" };
    }
    return { kind: "hold" };
  }

  const nudging = state.rate !== 1;
  if (!nudging && off < DRIFT_START_NUDGE_SECONDS) return { kind: "hold" };
  // Straight back to normal, without waiting out the interval, or it would
  // sail past and need nudging the other way.
  if (nudging && off < DRIFT_SETTLED_SECONDS) return { kind: "rate", rate: 1 };

  const offset = Math.max(
    -DRIFT_MAX_RATE_OFFSET,
    Math.min(DRIFT_MAX_RATE_OFFSET, driftSeconds * DRIFT_RATE_GAIN)
  );
  let rate = Math.round((1 - offset) * 100) / 100;
  // Close to caught up the proportional nudge rounds to nothing, which would
  // leave the listener stuck just outside the settled band.
  if (rate === 1) rate = driftSeconds < 0 ? 1.01 : 0.99;
  if (Math.abs(rate - state.rate) < 0.01) return { kind: "hold" };
  if (
    rate !== 1 &&
    nowMs - state.lastRateChangeMs < DRIFT_RATE_CHANGE_INTERVAL_MS
  ) {
    return { kind: "hold" };
  }
  return { kind: "rate", rate };
}
