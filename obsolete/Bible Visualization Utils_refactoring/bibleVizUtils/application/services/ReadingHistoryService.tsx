import { InterpolateHexColors } from "bibleVizUtils.domain.functions.colors";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

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
  }): HexString => {
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
      const steppedProgress =
        Math.round(Math.max(progress, step) / step) * step;
      const index = steppedProgress / step;
      return stepColors[index] || baseColor;
    }

    return InterpolateHexColors(baseColor, userColor, progress, step);
  };

  getColorByRecency = (params: {
    recencyTimeSeconds: number;
    baseColor: HexString;
    userColor: HexString;
    step?: number;
    now?: Date;
  }): HexString => {
    const {
      recencyTimeSeconds,
      baseColor,
      userColor,
      now = new Date(),
    } = params;

    const threshold = this.#recencyThresholdTimeSeconds;
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const timeFrameSeconds = nowSeconds - threshold;
    const elapsedRecencySeconds = Math.max(recencyTimeSeconds - threshold, 0);

    const progress = Math.min(elapsedRecencySeconds / timeFrameSeconds, 1);

    const defaultStep =
      1 /
      Math.floor((now.getTime() - threshold * 1000) / (1000 * 60 * 60 * 24));
    const finalStep = params.step ?? defaultStep;

    return InterpolateHexColors(baseColor, userColor, progress, finalStep);
  };

  getRecencyThresholdTimeSeconds = () => {
    return this.#recencyThresholdTimeSeconds;
  };

  setRecencyThresholdTimeSeconds = (value: number) => {
    this.#recencyThresholdTimeSeconds = value;
  };
}
