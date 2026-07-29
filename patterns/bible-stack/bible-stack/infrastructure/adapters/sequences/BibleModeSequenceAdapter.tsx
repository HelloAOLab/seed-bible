import type { BibleModeSequenceAdapterPort } from "../../../application/ports/out/BibleMode";
import { HexToRgb } from "../../../domain/functions/colors";
import type { RGB } from "../../../domain/models/commonTypes";
import type { StackCrossLine } from "../../../domain/models/pieces";
import type { PiecesConfigProvider } from "../../config/pieces/PiecesConfigProvider";
import type { SequenceConfigProvider } from "../../config/sequences/SequenceConfigProvider";
import type { StackCrossLineMapper } from "../../mappers/StackCrossLineMapper";
import type { ColorLerper } from "../environment/ColorLerper";

interface AdapterParams {
  sequenceConfigProvider: SequenceConfigProvider;
  crossLineMapper: StackCrossLineMapper;
  colorLerper: ColorLerper;
  piecesConfigProvider: PiecesConfigProvider;
}

export class BibleModeSequenceAdapter implements BibleModeSequenceAdapterPort {
  #sequenceConfigProvider: AdapterParams["sequenceConfigProvider"];
  #crossLineMapper: AdapterParams["crossLineMapper"];
  #colorLerper: AdapterParams["colorLerper"];
  #piecesConfigProvider: AdapterParams["piecesConfigProvider"];

  constructor({
    sequenceConfigProvider,
    crossLineMapper,
    colorLerper,
    piecesConfigProvider,
  }: AdapterParams) {
    this.#sequenceConfigProvider = sequenceConfigProvider;
    this.#crossLineMapper = crossLineMapper;
    this.#colorLerper = colorLerper;
    this.#piecesConfigProvider = piecesConfigProvider;
  }

  showToggleAttemptFeedback({
    crossVerticalLine,
    crossHorizontalLine,
  }: {
    crossVerticalLine: StackCrossLine;
    crossHorizontalLine: StackCrossLine;
  }): Promise<void[]> {
    const emphasizeAnimationDuration =
      this.#sequenceConfigProvider.getToggleBibleModeAnimationConfig(
        "emphasizeAnimationDuration"
      );
    const endingColor =
      this.#sequenceConfigProvider.getToggleBibleModeAnimationConfig(
        "endingColor"
      );

    const crossLines = [crossVerticalLine, crossHorizontalLine];

    return Promise.all(
      crossLines.map((crossLine) => {
        const crossLineBot = this.#crossLineMapper.toInfrastructure(crossLine);

        if (!crossLineBot) {
          throw new Error(
            "BibleModeSequenceAdapter: crossVerticalLineBot not found at showToggleAttemptFeedback."
          );
        }

        return this.#colorLerper.lerp({
          start: HexToRgb({
            hexColor:
              this.#piecesConfigProvider.getInitialConfig("StackCrossLine")
                .color!,
          }),
          end: [...endingColor] as RGB,
          durationSec: emphasizeAnimationDuration,
          bot: crossLineBot,
          tag: "color",
        });
      })
    );
  }

  finishToggleAttemptFeedback({
    crossVerticalLine,
    crossHorizontalLine,
  }: {
    crossVerticalLine: StackCrossLine;
    crossHorizontalLine: StackCrossLine;
  }) {
    const crossLines = [crossVerticalLine, crossHorizontalLine];

    const deemphasizeAnimationDuration =
      this.#sequenceConfigProvider.getToggleBibleModeAnimationConfig(
        "deemphasizeAnimationDuration"
      );

    const start: RGB = [
      ...this.#sequenceConfigProvider.getToggleBibleModeAnimationConfig(
        "endingColor"
      ),
    ];

    crossLines.forEach((crossLine) => {
      const crossLineBot = this.#crossLineMapper.toInfrastructure(crossLine);

      if (!crossLineBot) {
        throw new Error(
          "BibleModeSequenceAdapter: crossVerticalLineBot not found at showToggleAttemptFeedback."
        );
      }

      const end = HexToRgb({
        hexColor:
          this.#piecesConfigProvider.getInitialConfig("StackCrossLine").color!,
      });

      this.#colorLerper.lerp({
        start,
        end,
        durationSec: deemphasizeAnimationDuration,
        bot: crossLineBot,
        tag: "color",
      });
    });
  }

  async showAttemptStopFeedback({
    crossVerticalLine,
    crossHorizontalLine,
  }: {
    crossVerticalLine: StackCrossLine;
    crossHorizontalLine: StackCrossLine;
  }): Promise<void> {
    const deemphasizeAnimationDuration =
      this.#sequenceConfigProvider.getToggleBibleModeAnimationConfig(
        "deemphasizeAnimationDuration"
      );
    const crossLines = [crossVerticalLine, crossHorizontalLine];
    await Promise.all(
      crossLines.map((crossLine) => {
        const crossLineBot = this.#crossLineMapper.toInfrastructure(crossLine);
        if (!crossLineBot) {
          throw new Error(
            "BibleModeSequenceAdapter: crossLine not found at showAttemptStopFeedback"
          );
        }

        return this.#colorLerper.lerp({
          start: HexToRgb({
            hexColor:
              crossLineBot.tags.color ??
              this.#piecesConfigProvider.getInitialConfig("StackCrossLine")
                .color ??
              "#FFFFFF",
          }),
          end: HexToRgb({
            hexColor:
              this.#piecesConfigProvider.getInitialConfig("StackCrossLine")
                .color ?? "#FFFFFF",
          }),
          durationSec: deemphasizeAnimationDuration,
          bot: crossLineBot,
          tag: "color",
        });
      })
    );
  }
}
