import type { BibleSetupAdapterPort } from "bibleStack.application.ports.bibleLifecycle";
import type { BibleSetupAdapterParams } from "bibleStack.infrastructure.ports.bibleSetup";
import type {
  BibleTransformerBot,
  BibleShadowBot,
  CoverBot,
  CrossLineBot,
  BibleTransformerTags,
  BibleShadowTags,
  CoverTags,
  CrossLineTags,
  TestamentTags,
  LowerCoverTags,
  LowerCoverBot,
} from "bibleStack.models.stack";
import { ApplyStrictMod } from "bibleVizUtils.infrastructure.functions.casualos";
import { GetDarkerColor } from "bibleVizUtils.domain.functions.colors";
import { BibleType } from "bibleVizUtils.domain.models.canvas";
// import { GetIsInHistoryMode } from "bibleVizUtils.services.HistoryMode";
import type { WorldPosition } from "bibleStack.domain.models.spatial";
import type { BibleTypeType, Piece } from "bibleVizUtils.domain.models.canvas";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";

export class BibleSetupAdapter implements BibleSetupAdapterPort {
  #configProviderPort: BibleSetupAdapterParams["configProviderPort"];
  #visualStateRegistryPort: BibleSetupAdapterParams["visualStateRegistryPort"];
  #pieceMapperPort: BibleSetupAdapterParams["pieceMapperPort"];
  #stackPieceLifecycleAdapterPort: BibleSetupAdapterParams["stackPieceLifecycleAdapterPort"];
  #testamentMapperPort: BibleSetupAdapterParams["testamentMapperPort"];
  #dimensionProviderPort: BibleSetupAdapterParams["dimensionProviderPort"];

  constructor({
    configProviderPort,
    visualStateRegistryPort,
    pieceMapperPort,
    stackPieceLifecycleAdapterPort,
    testamentMapperPort,
    dimensionProviderPort,
  }: BibleSetupAdapterParams) {
    this.#configProviderPort = configProviderPort;
    this.#visualStateRegistryPort = visualStateRegistryPort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#stackPieceLifecycleAdapterPort = stackPieceLifecycleAdapterPort;
    this.#testamentMapperPort = testamentMapperPort;
    this.#dimensionProviderPort = dimensionProviderPort;
  }

  setUp({
    bibleData,
    position,
    bibleType,
  }: {
    bibleData: StackBibleData;
    position: WorldPosition;
    bibleType: BibleTypeType;
  }) {
    const coverScales =
      this.#configProviderPort.getStackPieceMeasurement("CoverScales");
    const testamentScales =
      this.#configProviderPort.getStackPieceMeasurement("TestamentScales");
    const leftCoverScales =
      this.#configProviderPort.getStackPieceMeasurement("LeftCoverScales");
    const crossLineWidthRatio =
      this.#configProviderPort.getStackPieceMeasurement("CrossLineWidthRatio");
    const crossLineDepth =
      this.#configProviderPort.getStackPieceMeasurement("CrossLineDepth");
    const testamentAdditionalScaleOnHover =
      this.#configProviderPort.getStackPieceMeasurement(
        "TestamentAdditionalScaleOnHover"
      );
    const crossHorizontalYOffsetRatio =
      this.#configProviderPort.getStackPieceMeasurement(
        "CrossHorizontalYOffsetRatio"
      );
    const bibleShadowOffsetZ =
      this.#configProviderPort.getStackSpacing("BibleShadowOffsetZ");

    const dimension = this.#dimensionProviderPort.getCurrentDimension();
    const bibleTransformerPosition = position;
    const bibleTransformerRotationZ = this.#configProviderPort.getStackSpacing(
      "BibleTransformerInitialRotationZ"
    );
    const bibleShadowPosition = new Vector3(
      this.#configProviderPort.getStackSpacing("BibleShadowOffsetX"),
      this.#configProviderPort.getStackSpacing("BibleShadowOffsetY"),
      bibleShadowOffsetZ
    );
    const lowerCoverPosition = new Vector3(
      this.#configProviderPort.getStackSpacing("LowerCoverOffsetX"),
      this.#configProviderPort.getStackSpacing("LowerCoverOffsetY"),
      this.#configProviderPort.getStackSpacing("LowerCoverOffsetZ")
    );
    const testamentsPosition = new Vector3(
      this.#configProviderPort.getStackSpacing("TestamentOffsetX"),
      this.#configProviderPort.getStackSpacing("TestamentOffsetY"),
      lowerCoverPosition.z + coverScales.z
    );
    const upperCoverPosition = new Vector3(
      this.#configProviderPort.getStackSpacing("UpperCoverOffsetX"),
      this.#configProviderPort.getStackSpacing("UpperCoverOffsetY"),
      lowerCoverPosition.z + coverScales.z + testamentScales.z
    );
    const leftCoverPosition = new Vector3(
      upperCoverPosition.x - coverScales.x / 2 + leftCoverScales.x / 2,
      this.#configProviderPort.getStackSpacing("LeftCoverOffsetY"),
      lowerCoverPosition.z + coverScales.z
    );
    const crossVerticalLinePosition = new Vector3(
      this.#configProviderPort.getStackSpacing("CrossVerticalLineOffsetX"),
      this.#configProviderPort.getStackSpacing("CrossVerticalLineOffsetY"),
      upperCoverPosition.z + coverScales.z
    );
    const crossVerticalLineScales = new Vector3(
      coverScales.x * crossLineWidthRatio,
      coverScales.y / 2,
      crossLineDepth
    );
    const crossHorizontalLinePosition = new Vector3(
      this.#configProviderPort.getStackSpacing("CrossHorizontalLineOffsetX"),
      crossVerticalLinePosition.y +
        crossVerticalLineScales.y * crossHorizontalYOffsetRatio,
      upperCoverPosition.z + coverScales.z
    );
    const crossHorizontalLineScales = new Vector3(
      crossVerticalLineScales.y / 2,
      crossVerticalLineScales.x,
      crossLineDepth
    );

    const bibleTransformerMod: Partial<BibleTransformerTags> = {
      [dimension]: true,
      [dimension + "X"]: bibleTransformerPosition.x,
      [dimension + "Y"]: bibleTransformerPosition.y,
      [dimension + "Z"]: bibleTransformerPosition.z,
      [dimension + "RotationZ"]: bibleTransformerRotationZ,
    };
    const bibleShadowMod: Partial<BibleShadowTags> = {
      [dimension]: true,
      [dimension + "X"]: bibleShadowPosition.x,
      [dimension + "Y"]: bibleShadowPosition.y,
      [dimension + "Z"]: bibleShadowPosition.z,
      transformer: bibleData.getStaticPieceId("bibleTransformer"),
    };
    const upperCoverMod: Partial<CoverTags> = {
      [dimension]: true,
      [dimension + "X"]: upperCoverPosition.x,
      [dimension + "Y"]: upperCoverPosition.y,
      [dimension + "Z"]: upperCoverPosition.z,
      scaleX: coverScales.x,
      scaleY: coverScales.y,
      scaleZ: coverScales.z,
      pointable: bibleType === BibleType.Default,
      transformer: bibleData.getStaticPieceId("bibleTransformer"),
      // isGoalZonePlatform: bibleType === BibleType.PlatformerGame, TODO: Decide what to do with this
    };
    const lowerCoverMod: Partial<LowerCoverTags> = {
      [dimension]: true,
      [dimension + "X"]: lowerCoverPosition.x,
      [dimension + "Y"]: lowerCoverPosition.y,
      [dimension + "Z"]: lowerCoverPosition.z,
      scaleX: coverScales.x,
      scaleY: coverScales.y,
      scaleZ: coverScales.z,
      transformer: bibleData.getStaticPieceId("bibleTransformer"),
      draggable: true,
      pointable: bibleType === BibleType.Default,
      onDrag: `@os.enableCustomDragging();`,
      onDragging: `@const dimension = os.getCurrentDimension();
const positionUpdateThreshold = 50;

if(!thisBot.masks.lastPositionUpdateTime || os.localTime > (thisBot.masks.lastPositionUpdateTime + positionUpdateThreshold))
{
    setTagMask(thisBot, 'lastPositionUpdateTime', os.localTime);
    const positionDifference = new Vector2(that.to.x - that.from.x, that.to.y - that.from.y)
    const transformer = getBot(byID(thisBot.tags.transformer));
    const transformerPosition = getBotPosition(transformer, dimension);
    const newPosition = new Vector2(transformerPosition.x + positionDifference.x, transformerPosition.y + positionDifference.y);
    const transformerChildren = getBots(byTag('transformer', transformer.id));
    setTagMask(transformer, dimension + 'X', newPosition.x);
    setTagMask(transformer, dimension + 'Y', newPosition.y);
    whisper(transformerChildren, 'onBotChanged', {force: true});
}`,
    };
    const leftCoverMod: Partial<CoverTags> = {
      [dimension]: true,
      [dimension + "X"]: leftCoverPosition.x,
      [dimension + "Y"]: leftCoverPosition.y,
      [dimension + "Z"]: leftCoverPosition.z,
      scaleX: leftCoverScales.x,
      scaleY: leftCoverScales.y,
      scaleZ: leftCoverScales.z,
      pointable: bibleType === BibleType.Default,
      transformer: bibleData.getStaticPieceId("bibleTransformer"),
    };
    const crossVerticalLineMod: Partial<CrossLineTags> = {
      [dimension]: true,
      [dimension + "X"]: crossVerticalLinePosition.x,
      [dimension + "Y"]: crossVerticalLinePosition.y,
      [dimension + "Z"]: crossVerticalLinePosition.z,
      scaleX: crossVerticalLineScales.x,
      scaleY: crossVerticalLineScales.y,
      scaleZ: crossVerticalLineScales.z,
      pointable: bibleType === BibleType.Default,
      transformer: bibleData.getStaticPieceId("bibleTransformer"),
    };
    const crossHorizontalLineMod: Partial<CrossLineTags> = {
      [dimension]: true,
      [dimension + "X"]: crossHorizontalLinePosition.x,
      [dimension + "Y"]: crossHorizontalLinePosition.y,
      [dimension + "Z"]: crossHorizontalLinePosition.z,
      scaleX: crossHorizontalLineScales.x,
      scaleY: crossHorizontalLineScales.y,
      scaleZ: crossHorizontalLineScales.z,
      pointable: bibleType === BibleType.Default,
      transformer: bibleData.getStaticPieceId("bibleTransformer"),
    };

    const testamentPiecesMap: Map<
      StackTestamentData["id"],
      Piece<"StackTestament">
    > = new Map();

    for (const testamentData of bibleData.childrenData) {
      const testament = this.#stackPieceLifecycleAdapterPort.spawnTestament();
      const fixedColor =
        testamentData.highlightColor ??
        testamentData.getPieceInfoProperty("color") ??
        "#FFFFFF";
      const testamentMod: Partial<TestamentTags> = {
        [dimension]: true,
        [dimension + "X"]: testamentsPosition.x,
        [dimension + "Y"]: testamentsPosition.y,
        [dimension + "Z"]: testamentsPosition.z,
        formOpacity: 1,
        scale: 1,
        color: fixedColor,
        scaleX: testamentScales.x,
        scaleY: testamentScales.y,
        scaleZ: testamentScales.z,
        pointable: bibleType === BibleType.Default,
        transformer: bibleData.getStaticPieceId("bibleTransformer"),
      };
      ApplyStrictMod(testament, testamentMod);
      const testamentPiece = this.#testamentMapperPort.toDomain(testament);
      this.#visualStateRegistryPort.registerState({
        piece: testamentPiece,
        state: {
          orginalColor: fixedColor,
          initialColor: fixedColor,
          labelTextColor: GetDarkerColor(
            testamentData.getPieceInfoProperty("color") ?? "#000000"
          ),
          initialScaleX: testamentScales.x,
          hoveredScaleX:
            testamentScales.x * (1 + testamentAdditionalScaleOnHover),
          initialScaleY: testamentScales.y,
          hoveredScaleY:
            testamentScales.y * (1 + testamentAdditionalScaleOnHover),
          initialScaleZ: testamentScales.z,
          desiredScaleZ: testamentScales.z,
          desiredPositionZ: 0,
        },
      });
      testamentPiecesMap.set(testamentData.id, testamentPiece);
      // if (GetIsInHistoryMode() && bibleType === BibleType.Default)
      //   setTagMask(testament, "color", "#FFFFFF");
    }

    const toBot = (piece: ReturnType<typeof bibleData.getStaticPiece>) =>
      piece ? this.#pieceMapperPort.toInfrastructure(piece) : undefined;

    ApplyStrictMod(
      toBot(
        bibleData.getStaticPiece("bibleTransformer")
      ) as BibleTransformerBot,
      bibleTransformerMod
    );
    this.#visualStateRegistryPort.registerState({
      piece: bibleData.getStaticPiece("bibleTransformer")!,
      state: { initialPositionZ: bibleTransformerPosition.z },
    });
    ApplyStrictMod(
      toBot(bibleData.getStaticPiece("bibleShadow")) as BibleShadowBot,
      bibleShadowMod
    );
    ApplyStrictMod(
      toBot(bibleData.getStaticPiece("upperCover")) as CoverBot,
      upperCoverMod
    );
    ApplyStrictMod(
      toBot(bibleData.getStaticPiece("lowerCover")) as LowerCoverBot,
      lowerCoverMod
    );
    ApplyStrictMod(
      toBot(bibleData.getStaticPiece("leftCover")) as CoverBot,
      leftCoverMod
    );
    ApplyStrictMod(
      toBot(bibleData.getStaticPiece("crossVerticalLine")) as CrossLineBot,
      crossVerticalLineMod
    );
    ApplyStrictMod(
      toBot(bibleData.getStaticPiece("crossHorizontalLine")) as CrossLineBot,
      crossHorizontalLineMod
    );

    return {
      testamentPiecesMap,
    };
  }
}
