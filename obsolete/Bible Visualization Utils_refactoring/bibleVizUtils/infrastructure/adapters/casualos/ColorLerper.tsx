import type { RGB } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/commonTypes";
import type { PieceBot } from "../../models/casualos";
import {
  ClampRGBColor,
  HexToRgb,
  RgbToHex,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/functions/colors";
import { SetStrictTag } from "../../functions/casualos";

export type LerpableTags = "color" | "labelColor";

export interface LerpData {
  botId: string;
  tag: LerpableTags;
  lerpId: string;
  reject: (reason?: string) => void;
}

export interface LerpParams {
  start?: RGB;
  end: RGB;
  durationSec: number;
  bot: PieceBot;
  tag: LerpableTags;
}

export class ColorLerper {
  #lerps: Map<LerpData["botId"], Map<LerpData["tag"], LerpData>>;

  constructor() {
    this.#lerps = new Map();
  }

  async lerp({ start, end, durationSec, bot, tag }: LerpParams): Promise<void> {
    const actualStart =
      start ??
      HexToRgb({
        hexColor: bot.masks[tag] ?? bot.tags[tag] ?? "#ffffff",
      });
    this.stop(bot, tag);

    if (
      actualStart[0] === end[0] &&
      actualStart[1] === end[1] &&
      actualStart[2] === end[2]
    )
      return;

    return new Promise((resolve, reject) => {
      const divisionFactor = 20;
      const difference: RGB = [
        end[0] - actualStart[0],
        end[1] - actualStart[1],
        end[2] - actualStart[2],
      ];
      const differenceFraction: RGB = [
        difference[0] / divisionFactor,
        difference[1] / divisionFactor,
        difference[2] / divisionFactor,
      ];

      const currentColor = actualStart;
      let i = 0;
      const rgbColors: RGB[] = [];
      for (let j = 1; j < divisionFactor; j++) {
        const rgbColor = ClampRGBColor([
          currentColor[0] + differenceFraction[0] * j,
          currentColor[1] + differenceFraction[1] * j,
          currentColor[2] + differenceFraction[2] * j,
        ]);
        rgbColors.push(rgbColor);
      }
      const intervalId = setInterval(
        () => {
          const hexColor = RgbToHex({
            rgbColor: rgbColors[i]!,
          });
          SetStrictTag(bot, tag, hexColor);
          i++;

          if (i >= divisionFactor) {
            const finalColor = RgbToHex({
              rgbColor: ClampRGBColor(end),
            });
            SetStrictTag(bot, tag, finalColor);
            this.clearLerpData(bot.id, tag);
            clearInterval(lerpData.lerpId);
            resolve();
          }
        },
        (durationSec * 1000) / divisionFactor
      );

      const lerpData: LerpData = {
        botId: bot.id,
        tag,
        lerpId: String(intervalId),
        reject,
      };
      if (!this.#lerps.has(bot.id)) {
        this.#lerps.set(bot.id, new Map());
      }
      this.#lerps.get(bot.id)?.set(tag, lerpData);
    });
  }

  stop(bot: PieceBot, tag: LerpableTags) {
    const data = this.getLerpData(bot.id, tag);

    if (data) {
      this.clearLerpData(bot.id, tag);
      data.reject("ColorLerper: Color lerp has been canceled");
      clearInterval(data.lerpId);
    }
  }

  getLerpData(botId: string, tag: LerpableTags): LerpData | undefined {
    return this.#lerps.get(botId)?.get(tag);
  }

  clearLerpData(botId: string, tag: LerpableTags) {
    if (this.getLerpData(botId, tag)) {
      this.#lerps.get(botId)!.delete(tag);
    }
  }
}
