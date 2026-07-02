import { GetCamRotationFocusPoint } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/functions/math";
import {
  MakePortalFree,
  MakePortalRestrict,
} from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/casualos";
import type { BibleRecenterAdapterPort } from "@packages/Bible Stack/bibleStack/application/ports/out/SpatialNavigation";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";
import type { StackTransformerMapper } from "../../mappers/StackTransformerMapper";
import type { StackCoverMapper } from "../../mappers/StackCoverMapper";
import { DirectionToPolar } from "@packages/Bible Stack/bibleStack/domain/functions/Geometry";

interface AdapterParams {
  getDimension(): string;
  transformerMapper: StackTransformerMapper;
  coverMapper: StackCoverMapper;
}

export class BibleRecenterAdapter implements BibleRecenterAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #transformerMapper: AdapterParams["transformerMapper"];
  #coverMapper: AdapterParams["coverMapper"];

  constructor({ getDimension, transformerMapper, coverMapper }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#transformerMapper = transformerMapper;
    this.#coverMapper = coverMapper;
  }

  /**
   * Query: is the bible currently off-screen (so a recenter would be needed)?
   * Pure read — does not move the camera, so it can run without a UI sequence lock.
   */
  async isBibleOffScreen(bible: StackBibleData): Promise<boolean> {
    const dimension = this.#getDimension();
    const transformer = bible.getStaticPiece("bibleTransformer");
    const upperCover = bible.getStaticPiece("upperCover");
    if (!transformer || !upperCover) {
      console.warn(
        "BibleRecenterAdapter: static pieces not defined at isBibleOffScreen"
      );
      return false;
    }
    const transformerBot =
      this.#transformerMapper.toInfrastructure(transformer);
    const upperCoverBot = this.#coverMapper.toInfrastructure(upperCover);
    if (!transformerBot || !upperCoverBot) {
      console.warn(
        "BibleRecenterAdapter: static piece bots not found at isBibleOffScreen"
      );
      return false;
    }

    const screenUpperLeft =
      await os.calculateScreenCoordinatesFromViewportCoordinates(
        "grid",
        new Vector2(-1, 1)
      );
    const transformerPosition = getBotPosition(transformerBot, dimension);
    const projectedTransformerPosition = new Vector3(
      transformerPosition.x,
      transformerPosition.y,
      0
    );
    const upperCoverPosition = getBotPosition(upperCoverBot, dimension);
    const upperCoverAbsolutePosition =
      upperCoverPosition.add(transformerPosition);
    const cameraRotation = os.getCameraRotation("grid");
    const cameraForwardDirection = math.getForwardDirection(cameraRotation);
    const { phi, theta } = DirectionToPolar(cameraForwardDirection);
    const limitPosition = GetCamRotationFocusPoint({
      theta,
      phi,
      botPosition: upperCoverAbsolutePosition,
    });
    const areaRadius = limitPosition
      .subtract(projectedTransformerPosition)
      .length();
    const focusPoint = os.getFocusPoint("grid");
    const focusPointToCenterDistance = focusPoint
      .subtract(projectedTransformerPosition)
      .length();

    const transformerCoordinates =
      await os.calculateScreenCoordinatesFromPosition(
        "grid",
        transformerPosition
      );
    const fixedTransormerCoordinates =
      transformerCoordinates.subtract(screenUpperLeft);
    const upperCoverCoordinates =
      await os.calculateScreenCoordinatesFromPosition(
        "grid",
        upperCoverAbsolutePosition
      );
    const fixedUpperCoverCoordinates =
      upperCoverCoordinates.subtract(screenUpperLeft);

    const isFocusPointInsideArea = focusPointToCenterDistance <= areaRadius;
    const isTransformerVisible =
      fixedTransormerCoordinates.x >= 0 &&
      fixedTransormerCoordinates.x <= gridPortalBot.tags.pixelWidth &&
      fixedTransormerCoordinates.y >= 0 &&
      fixedTransormerCoordinates.y <= gridPortalBot.tags.pixelHeight;
    const isUpperCoverVisible =
      fixedUpperCoverCoordinates.x >= 0 &&
      fixedUpperCoverCoordinates.x <= gridPortalBot.tags.pixelWidth &&
      fixedUpperCoverCoordinates.y >= 0 &&
      fixedUpperCoverCoordinates.y <= gridPortalBot.tags.pixelHeight;

    return (
      !isFocusPointInsideArea && !isTransformerVisible && !isUpperCoverVisible
    );
  }

  /**
   * Command: recenter the camera on the bible. Assumes the action is needed
   * (the caller has already queried `isBibleOffScreen`).
   */
  async recenter(bible: StackBibleData): Promise<void> {
    const transformer = bible.getStaticPiece("bibleTransformer");
    if (!transformer) {
      console.warn("BibleRecenterAdapter: transformer not defined at recenter");
      return;
    }
    const transformerBot =
      this.#transformerMapper.toInfrastructure(transformer);
    if (!transformerBot) {
      throw new Error(
        "BibleRecenterAdapter: transformerBot not found at recenter"
      );
    }

    MakePortalRestrict();
    const duration = 1;
    const easing = { type: "sinusoidal", mode: "inout" } as const;
    await os.focusOn(transformerBot, {
      duration,
      easing,
    });
    MakePortalFree();
  }
}
