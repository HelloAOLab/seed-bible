import {
  AnimateStrictTag,
  ApplyStrictMod,
  GetBotScales,
} from "../../functions/casualos";
import type { TestamentSelectionAdapterPort } from "../../../application/ports/out/TestamentSelection";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { StackTestamentMapper } from "../../mappers/StackTestamentMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { StackSectionBookMapper } from "../../mappers/StackSectionBookMapper";
import type { LayoutConfigProvider } from "../../config/layout/LayoutConfigProvider";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { SectionBot, BookBot } from "../../models/stack";
import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { TestamentSelectionConfigProvider } from "../../config/testamentSelection/TestamentSelectionConfigProvider";

interface AdapterParams {
  getDimension(): string;
  testamentMapper: StackTestamentMapper;
  sectionMapper: StackSectionMapper;
  sectionBookMapper: StackSectionBookMapper;
  configProvider: LayoutConfigProvider;
  visualStateRegistry: VisualStateRegistry;
  selectionConfigProvider: TestamentSelectionConfigProvider;
}

/** A spawned section's target depth/position, resolved before the testament grows. */
interface SectionLayout {
  bot: SectionBot | BookBot;
  desiredScaleZ: number;
  desiredPositionZ: number;
}

export class TestamentSelectionAdapter implements TestamentSelectionAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #testamentMapper: AdapterParams["testamentMapper"];
  #sectionMapper: AdapterParams["sectionMapper"];
  #sectionBookMapper: AdapterParams["sectionBookMapper"];
  #configProvider: AdapterParams["configProvider"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #selectionConfigProvider: AdapterParams["selectionConfigProvider"];

  constructor({
    getDimension,
    testamentMapper,
    sectionMapper,
    sectionBookMapper,
    configProvider,
    visualStateRegistry,
    selectionConfigProvider,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#testamentMapper = testamentMapper;
    this.#sectionMapper = sectionMapper;
    this.#sectionBookMapper = sectionBookMapper;
    this.#configProvider = configProvider;
    this.#visualStateRegistry = visualStateRegistry;
    this.#selectionConfigProvider = selectionConfigProvider;
  }

  /**
   * Lays out the sections the service just spawned and grows the testament to
   * fit them, then fades the testament out so the sections take its place.
   *
   */
  async select(
    data: StackTestamentData,
    pacing: StackUpdatePacing = "Regular"
  ): Promise<void> {
    const testamentPiece = data.piece;
    if (!testamentPiece) {
      throw new Error(
        "TestamentSelectionAdapter: data.piece not defined at select"
      );
    }
    const testamentBot = this.#testamentMapper.toInfrastructure(testamentPiece);
    if (!testamentBot) {
      throw new Error(
        "TestamentSelectionAdapter: testamentBot not found at select"
      );
    }

    const dimension = this.#getDimension();
    const animationsDuration =
      this.#selectionConfigProvider.getDuration(pacing);
    const animationsEasing = this.#selectionConfigProvider.getEasing();
    const sectionInitialScaleZ =
      this.#selectionConfigProvider.getSectionInitialScaleZ();
    const desiredTestamentScale =
      this.#selectionConfigProvider.getDesiredScale();
    const desiredTestamentFormOpacity =
      this.#selectionConfigProvider.getDesiredFormOpacity();

    const testamentPosition = getBotPosition(testamentBot, dimension);
    const testamentScales = GetBotScales(testamentBot);
    const betweenSections =
      this.#configProvider.getStackSpacing("BetweenSections");
    const sectionScales =
      this.#configProvider.getStackPieceMeasurement("SectionScales");
    const additionalScaleOnHover =
      this.#configProvider.getStackPieceMeasurement(
        "SectionAditionalScaleOnHover"
      );
    const desiredScaleZRatio = this.#configProvider.getStackPieceMeasurement(
      "SectionDesiredScaleZRatio"
    );

    const layouts = new Map<
      NonNullable<StackTestamentData["piece"]>["id"],
      SectionLayout
    >();
    let sectionDesiredPositionZ = testamentPosition.z + betweenSections;

    // 1. Configure every spawned section bot at its collapsed initial state.
    for (const sectionData of data.childrenData) {
      const desiredScaleZ =
        sectionData.getCreationParam("amountOfChaptersInSection") *
        desiredScaleZRatio;
      const color =
        sectionData.paintColor ?? sectionData.getPieceInfoProperty("color");

      const mod = {
        [dimension]: true,
        [dimension + "X"]: 0,
        [dimension + "Y"]: 0,
        [dimension + "Z"]: testamentPosition.z,
        [dimension + "RotationZ"]: 0,
        scaleX: sectionScales.x,
        scaleY: sectionScales.y,
        scaleZ: sectionInitialScaleZ,
        color,
        labelOpacity: 0,
        formOpacity: 0.7,
        draggable: testamentBot.tags.draggable,
      };

      if (sectionData.type === "StackSection") {
        const piece = sectionData.piece;
        if (!piece) continue;
        const sectionBot = this.#sectionMapper.toInfrastructure(piece);
        if (!sectionBot) continue;

        ApplyStrictMod(sectionBot, mod);

        // TODO: was desiredScaleZ * (customExplodedViewScaleFactor ?? 2); the
        // factor is not on the new SectionInfo yet.
        const explodedViewScaleZ = desiredScaleZ * 2;
        this.#visualStateRegistry.registerState({
          piece,
          state: {
            initialScaleX: sectionScales.x,
            initialScaleY: sectionScales.y,
            initialScaleZ: desiredScaleZ,
            hoveredScaleX: sectionScales.x + additionalScaleOnHover,
            hoveredScaleY: sectionScales.y + additionalScaleOnHover,
            hoveredFormOpacity: 1,
            unhoveredFormOpacity: 0.7,
            orginalColor: sectionData.getPieceInfoProperty("color"),
            initialColor: sectionData.getPieceInfoProperty("color"),
            // TODO: labelTextColor should be the darker variant of the color.
            labelTextColor: sectionData.getPieceInfoProperty("color"),
            desiredScaleZ,
            desiredPositionZ: sectionDesiredPositionZ,
            initialExplodedViewScaleZ: explodedViewScaleZ,
            desiredExplodedViewScaleZ: explodedViewScaleZ,
          },
        });

        layouts.set(piece.id, {
          bot: sectionBot,
          desiredScaleZ,
          desiredPositionZ: sectionDesiredPositionZ,
        });
      } else {
        const piece = sectionData.piece;
        if (!piece) continue;
        const sectionBot = this.#sectionBookMapper.toInfrastructure(piece);
        if (!sectionBot) continue;

        applyMod(sectionBot, mod);
        // TODO: register the section-book's visual state (BookVisualState shape).

        layouts.set(piece.id, {
          bot: sectionBot,
          desiredScaleZ,
          desiredPositionZ: sectionDesiredPositionZ,
        });
      }

      sectionDesiredPositionZ += betweenSections + desiredScaleZ;
    }

    // 2. Grow the testament so it spans all of its sections.
    let totalSectionsScaleZ = 0;
    for (const layout of layouts.values()) {
      totalSectionsScaleZ += layout.desiredScaleZ;
    }
    const testamentDesiredScaleZ =
      totalSectionsScaleZ + (data.childrenData.length + 1) * betweenSections;

    await AnimateStrictTag(testamentBot, "scaleZ", {
      fromValue: testamentScales.z,
      toValue: testamentDesiredScaleZ,
      duration: animationsDuration,
      easing: animationsEasing,
    });

    // 3. Reveal each section at its final depth/position now the testament grew.
    for (const layout of layouts.values()) {
      setTagMask(layout.bot, "scaleZ", layout.desiredScaleZ);
      setTagMask(layout.bot, dimension + "Z", layout.desiredPositionZ);
      setTagMask(layout.bot, "highlightable", true);
    }

    // 4. Fade the testament out; the sections now own the surface.
    await AnimateStrictTag(testamentBot, {
      fromValue: {
        scale: testamentBot.tags.scale,
        formOpacity: testamentBot.tags.formOpacity,
      },
      toValue: {
        scale: desiredTestamentScale,
        formOpacity: desiredTestamentFormOpacity,
      },
      duration: animationsDuration,
      easing: animationsEasing,
    });
    setTagMask(testamentBot, "color", "clear");
    setTagMask(testamentBot, "pointable", false);

    /*
     * TODO — port the remaining legacy_SelectTestament infrastructure once the
     * supporting ports exist (a bibleData/static-piece source, an activity
     * notification port, the info-label transformer, camera focus and render
     * order). Kept here (adapted names) so nothing is lost:
     *
     *   // Hide the testament's activity notification.
     *   tryHideNotification(testamentBot);
     *
     *   // Unhighlight the pieces still highlighted in this bible.
     *   // (now owned by PieceHighlightService — wire pieceHighlighterPort)
     *
     *   // Reposition everything sitting above the testament by the delta it grew.
     *   const deltaScaleZ = testamentDesiredScaleZ - testamentScales.z;
     *   const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
     *   const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
     *   const sectionShadows = ...; // section shadows above testamentPosition.z
     *   const piecesAboveTestament = [bibleData.getStaticPiece("upperCover")]
     *     .concat(sectionShadows, crossLines, GetPiecesAboveTestament());
     *   piecesAboveTestament.forEach((piece) => {
     *     const pieceDesiredPositionZ = getBotPosition(piece, dimension).z + deltaScaleZ;
     *     setTag(piece, "desiredPositionZ", pieceDesiredPositionZ);
     *     animateTag(piece, dimension + "Z", { toValue: pieceDesiredPositionZ, ... });
     *   });
     *
     *   // Camera focus on the grown testament.
     *   const focusOnRotation = { x: 1.01229, y: 0.5 };
     *   os.focusOn({ x, y }, { duration, easing, rotation: focusOnRotation, zoom: 8 });
     *
     *   // Hide + release the current info-label transformer.
     *   currentInfoLabelTransformer.Hide(...).then(() => releaseTransformer());
     *
     *   // History-mode coloring per section (GetHistoryColor).
     *
     *   // Render order for the active stack pieces.
     *   TrySetPiecesRenderOrder(activeBiblePieces);
     */
  }

  async deselect(_data: StackTestamentData): Promise<void> {
    // TODO: port the un-split (deselect) visual sequence from its legacy file.
    return Promise.resolve();
  }
}
