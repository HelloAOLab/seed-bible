import { BibleStates } from "../../../domain/models/canvas";
import { SetStrictTag } from "../../functions/casualos";
import type { StackCoverMapper } from "../../mappers/StackCoverMapper";
import type { CoverBot } from "../../models/stack";
import type { BibleDataRepository } from "./BibleDataRepository";

interface AdapterParams {
  bibleDataRepository: BibleDataRepository;
  coverMapper: StackCoverMapper;
}

export class UpperCoverOpacityAdapter {
  #bibleDataRepository: AdapterParams["bibleDataRepository"];
  #coverMapper: AdapterParams["coverMapper"];

  constructor({ bibleDataRepository, coverMapper }: AdapterParams) {
    this.#bibleDataRepository = bibleDataRepository;
    this.#coverMapper = coverMapper;
  }

  handleCameraRotationChanged() {
    const bibles = this.#bibleDataRepository.getAllBiblesData();
    const opacity = this.#computeOpacity();
    for (const bibleData of bibles) {
      const upperCover = bibleData.staticBiblePieces?.upperCover;
      if (!upperCover || bibleData.currentState !== BibleStates.Open) continue;

      const uppperCoverBot = this.#coverMapper.toInfrastructure(upperCover);

      if (!uppperCoverBot) {
        throw new Error(
          "UpperCoverOpacityAdapter: upperCoverBot not found at handleCameraRotationChanged."
        );
      }

      this.#setOpacity(uppperCoverBot, opacity);
    }
  }

  #setOpacity(cover: CoverBot, opacity: number) {
    SetStrictTag(cover, "formOpacity", opacity);
  }

  #computeOpacity(): number {
    const camForwardDirection = math.getForwardDirection(
      os.getCameraRotation("grid")
    );
    const camDirectionXY = new Vector3(
      camForwardDirection.x,
      camForwardDirection.y,
      0
    ).normalize();
    const angle = Vector3.angleBetween(camForwardDirection, camDirectionXY);
    const minRotationTreshold = math.degreesToRadians(50);
    const maxRotationTreshold = math.degreesToRadians(70);
    const opacity =
      1 -
      0.9 *
        Math.max(
          0,
          Math.min(
            1,
            (angle - minRotationTreshold) /
              (maxRotationTreshold - minRotationTreshold)
          )
        );
    return opacity;
  }
}
