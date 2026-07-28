import type { BibleModeSequenceAdapterPort } from "../../../application/ports/out/BibleMode";
import { HexToRgb } from "../../../domain/functions/colors";
import type { RGB } from "../../../domain/models/commonTypes";
import type { StackCrossLine } from "../../../domain/models/pieces";
import type { PiecesConfigProvider } from "../../config/pieces.tsx/PiecesConfigProvider";
import type { SequenceConfigProvider } from "../../config/sequences/SequenceConfigProvider";
import type { StackCrossLineMapper } from "../../mappers/StackCrossLineMapper";
import type { ColorLerper } from "../environment/ColorLerper";
import type { VisualStateRegistry } from "../stacks/VisualStateRegistry";

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
  }): Promise<boolean> {
    const firstAnimationDuration =
      this.#sequenceConfigProvider.getToggleBibleModeAnimationConfig(
        "firstAnimationDuration"
      );
    const secondAnimationDuration =
      this.#sequenceConfigProvider.getToggleBibleModeAnimationConfig(
        "secondAnimationDuration"
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
          durationSec: firstAnimationDuration,
          bot: crossLineBot,
          tag: "color",
        });
      })
    )
      .then(() => {
        crossLines.forEach((crossLine) => {
          const crossLineBot =
            this.#crossLineMapper.toInfrastructure(crossLine);

          if (!crossLineBot) {
            throw new Error(
              "BibleModeSequenceAdapter: crossVerticalLineBot not found at showToggleAttemptFeedback."
            );
          }

          this.#colorLerper.lerp({
            start: [...endingColor] as RGB,
            end: HexToRgb({
              hexColor:
                this.#piecesConfigProvider.getInitialConfig("StackCrossLine")
                  .color!,
            }),
            durationSec: secondAnimationDuration,
            bot: crossLineBot,
            tag: "color",
          });
        });
        return true;
      })
      .catch(() => {
        return false;
      });
  }
}
