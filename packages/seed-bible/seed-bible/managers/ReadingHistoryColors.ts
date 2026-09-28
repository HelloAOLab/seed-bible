import { InterpolateHexColors } from "./Colors";
import type { HexString } from "./Colors";

/**
 * Colour for a day's reading activity, interpolated from `baseColor` toward
 * `userColor` in proportion to how much of `fullColorTimeSeconds` was read.
 *
 * When both `step` and `stepColors` are given, the progress is quantized to
 * `step` and used to index `stepColors` instead of interpolating — that is how
 * the timeline's discrete legend swatches stay consistent with its cells.
 */
export function getColorByReadingTime(params: {
  baseColor: HexString;
  userColor: HexString;
  readingTimeSeconds: number;
  fullColorTimeSeconds?: number;
  step?: number;
  stepColors?: HexString[];
}): HexString {
  const {
    readingTimeSeconds,
    fullColorTimeSeconds = 900,
    baseColor,
    userColor,
    step,
    stepColors,
  } = params;

  const progress = Math.min(1, readingTimeSeconds / fullColorTimeSeconds);

  if (step && stepColors) {
    const steppedProgress = Math.round(Math.max(progress, step) / step) * step;
    const index = steppedProgress / step;
    return stepColors[index] || baseColor;
  }

  return InterpolateHexColors(baseColor, userColor, progress, step);
}

/**
 * Colour for how recently something was read: fully `userColor` for activity at
 * `now`, fading toward `baseColor` as it approaches
 * `recencyThresholdTimeSeconds` ago.
 *
 * The threshold is a parameter rather than ambient state so this stays pure;
 * `seed-bible-utils`' `ReadingHistoryService` holds the mutable threshold and
 * passes it in.
 */
export function getColorByRecency(params: {
  recencyTimeSeconds: number;
  baseColor: HexString;
  userColor: HexString;
  recencyThresholdTimeSeconds: number;
  step?: number;
  now?: Date;
}): HexString {
  const {
    recencyTimeSeconds,
    baseColor,
    userColor,
    recencyThresholdTimeSeconds: threshold,
    now = new Date(),
  } = params;

  const nowSeconds = Math.floor(now.getTime() / 1000);
  const timeFrameSeconds = nowSeconds - threshold;
  const elapsedRecencySeconds = Math.max(recencyTimeSeconds - threshold, 0);

  const progress = Math.min(elapsedRecencySeconds / timeFrameSeconds, 1);

  const defaultStep =
    1 / Math.floor((now.getTime() - threshold * 1000) / (1000 * 60 * 60 * 24));
  const finalStep = params.step ?? defaultStep;

  return InterpolateHexColors(baseColor, userColor, progress, finalStep);
}
