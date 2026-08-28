import {
  getColorByReadingTime as computeColorByReadingTime,
  getColorByRecency as computeColorByRecency,
} from "@packages/seed-bible/seed-bible/managers/ReadingHistoryColors";
import type { HexString } from "@packages/seed-bible/seed-bible/managers/Colors";

/**
 * Thin wrapper over the core colour functions, holding the one piece of state
 * they don't: the mutable recency threshold. The colour maths itself lives in
 * `managers/ReadingHistoryColors` so the core package can use it directly.
 *
 * The methods stay arrow-function properties — consumers destructure them off
 * the instance, so they must keep their `this` binding.
 */
export class ReadingHistoryService {
  #recencyThresholdTimeSeconds: number;

  constructor(recencyThresholdTime: number) {
    this.#recencyThresholdTimeSeconds = recencyThresholdTime;
  }

  getColorByReadingTime = (params: {
    baseColor: HexString;
    userColor: HexString;
    readingTimeSeconds: number;
    fullColorTimeSeconds?: number;
    step?: number;
    stepColors?: HexString[];
  }): HexString => computeColorByReadingTime(params);

  getColorByRecency = (params: {
    recencyTimeSeconds: number;
    baseColor: HexString;
    userColor: HexString;
    step?: number;
    now?: Date;
  }): HexString =>
    computeColorByRecency({
      ...params,
      recencyThresholdTimeSeconds: this.#recencyThresholdTimeSeconds,
    });

  getRecencyThresholdTimeSeconds = () => {
    return this.#recencyThresholdTimeSeconds;
  };

  setRecencyThresholdTimeSeconds = (value: number) => {
    this.#recencyThresholdTimeSeconds = value;
  };
}
