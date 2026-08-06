import {
  AnimateStrictTag,
  ApplyStrictMod,
  GetBotScales,
  SetStrictTag,
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
import { GetDarkerColor } from "../../../domain/functions/colors";
import type { SectionInfoMapper } from "../../mappers/SectionInfoMapper";
import type { PieceBotTags } from "../../models/casualos";
import type { Piece } from "../../../domain/models/canvas";
import { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type {
  CameraAdapterPort,
  RenderOrderAdapterPort,
} from "../../../application/ports/bibleLifecycle";
import type { BibleDataRepository } from "./BibleDataRepository";
import type { PieceDataRepository } from "./PieceDataRepository";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { PieceAdapter } from "./PieceAdapter";
import type { PiecesConfigProvider } from "../../config/pieces/PiecesConfigProvider";

interface AdapterParams {
  getDimension(): string;
  testamentMapper: StackTestamentMapper;
  sectionMapper: StackSectionMapper;
  sectionBookMapper: StackSectionBookMapper;
  configProvider: LayoutConfigProvider;
  visualStateRegistry: VisualStateRegistry;
  selectionConfigProvider: TestamentSelectionConfigProvider;
  sectionInfoMapper: SectionInfoMapper;
  cameraAdapterPort: CameraAdapterPort;
  renderOrderAdapterPort: RenderOrderAdapterPort;
  bibleDataRepository: BibleDataRepository;
  pieceDataRepository: PieceDataRepository;
  pieceMapper: PieceMapper;
  pieceAdapter: PieceAdapter;
  piecesConfigProviderPort: PiecesConfigProvider;
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
  #sectionInfoMapper: AdapterParams["sectionInfoMapper"];
  #cameraAdapterPort: AdapterParams["cameraAdapterPort"];
  #renderOrderAdapterPort: AdapterParams["renderOrderAdapterPort"];
  #bibleDataRepository: AdapterParams["bibleDataRepository"];
  #pieceDataRepository: AdapterParams["pieceDataRepository"];
  #pieceMapper: AdapterParams["pieceMapper"];
  #pieceAdapter: AdapterParams["pieceAdapter"];
  #piecesConfigProviderPort: AdapterParams["piecesConfigProviderPort"];

  constructor({
    getDimension,
    testamentMapper,
    sectionMapper,
    sectionBookMapper,
    configProvider,
    visualStateRegistry,
    selectionConfigProvider,
    sectionInfoMapper,
    cameraAdapterPort,
    renderOrderAdapterPort,
    bibleDataRepository,
    pieceDataRepository,
    pieceMapper,
    pieceAdapter,
    piecesConfigProviderPort,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#testamentMapper = testamentMapper;
    this.#sectionMapper = sectionMapper;
    this.#sectionBookMapper = sectionBookMapper;
    this.#configProvider = configProvider;
    this.#visualStateRegistry = visualStateRegistry;
    this.#selectionConfigProvider = selectionConfigProvider;
    this.#sectionInfoMapper = sectionInfoMapper;
    this.#cameraAdapterPort = cameraAdapterPort;
    this.#renderOrderAdapterPort = renderOrderAdapterPort;
    this.#bibleDataRepository = bibleDataRepository;
    this.#pieceDataRepository = pieceDataRepository;
    this.#pieceMapper = pieceMapper;
    this.#pieceAdapter = pieceAdapter;
    this.#piecesConfigProviderPort = piecesConfigProviderPort;
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
        labelOpacity:
          sectionData.type === "StackSection"
            ? this.#piecesConfigProviderPort.getInitialConfig("StackSection")
                .labelOpacity
            : this.#piecesConfigProviderPort.getInitialConfig(
                "StackSectionBook"
              ).labelOpacity,
        formOpacity:
          sectionData.type === "StackSection"
            ? this.#piecesConfigProviderPort.getInitialConfig("StackSection")
                .formOpacity
            : this.#piecesConfigProviderPort.getInitialConfig(
                "StackSectionBook"
              ).formOpacity,
        draggable: testamentBot.tags.draggable,
        transformer: testamentBot.tags.transformer,
      };

      if (sectionData.type === "StackSection") {
        const piece = sectionData.piece;
        if (!piece) continue;
        const sectionBot = this.#sectionMapper.toInfrastructure(piece);
        if (!sectionBot) continue;

        ApplyStrictMod(sectionBot, mod);

        const sectionInfoConfig = this.#sectionInfoMapper.toInfrastructure(
          sectionData.pieceInfo
        );
        const explodedViewScaleZ =
          desiredScaleZ *
          (sectionInfoConfig.customExplodedViewScaleFactor ?? 2);
        this.#visualStateRegistry.registerState({
          piece,
          state: {
            initialScaleX: sectionScales.x,
            initialScaleY: sectionScales.y,
            initialScaleZ: desiredScaleZ,
            hoveredScaleX: sectionScales.x + additionalScaleOnHover,
            hoveredScaleY: sectionScales.y + additionalScaleOnHover,
            hoveredFormOpacity:
              this.#piecesConfigProviderPort.getInitialVisualState(
                "StackSection"
              ).hoveredFormOpacity! ?? 1,
            unhoveredFormOpacity:
              this.#piecesConfigProviderPort.getInitialVisualState(
                "StackSection"
              ).unhoveredFormOpacity ?? 0,
            orginalColor: sectionData.getPieceInfoProperty("color"),
            initialColor: sectionData.getPieceInfoProperty("color"),
            labelTextColor: GetDarkerColor(
              sectionData.getPieceInfoProperty("color")
            ),
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

        ApplyStrictMod(sectionBot, mod);

        const bookScales =
          this.#configProvider.getStackPieceMeasurement("BookScales");
        this.#visualStateRegistry.registerState({
          piece,
          state: {
            hoveredFormOpacity:
              this.#piecesConfigProviderPort.getInitialVisualState(
                "StackSectionBook"
              ).hoveredFormOpacity ?? 1,
            unhoveredFormOpacity:
              this.#piecesConfigProviderPort.getInitialVisualState(
                "StackSectionBook"
              ).unhoveredFormOpacity ?? 0,
            orginalColor: sectionData.getPieceInfoProperty("color"),
            initialColor: sectionData.getPieceInfoProperty("color"),
            labelTextColor: GetDarkerColor(
              sectionData.getPieceInfoProperty("color")
            ),
            desiredScaleZ,
            desiredPositionZ: sectionDesiredPositionZ,
            chapterColumns: 0,
            chapterRows: 0,
            singleBooksScales: { x: bookScales.x, y: bookScales.y },
            unhoveredScales: {
              x: sectionScales.x,
              y: sectionScales.y,
              z: desiredScaleZ,
            },
            hoveredScales: {
              x: sectionScales.x + additionalScaleOnHover,
              y: sectionScales.y + additionalScaleOnHover,
              z: desiredScaleZ,
            },
          },
        });

        layouts.set(piece.id, {
          bot: sectionBot,
          desiredScaleZ,
          desiredPositionZ: sectionDesiredPositionZ,
        });
      }

      sectionDesiredPositionZ += betweenSections + desiredScaleZ;
    }

    // 2. Grow the testament so it spans all of its sections — concurrently
    // with focusing the camera on it and lifting every piece above it.
    let totalSectionsScaleZ = 0;
    for (const layout of layouts.values()) {
      totalSectionsScaleZ += layout.desiredScaleZ;
    }
    const testamentDesiredScaleZ =
      totalSectionsScaleZ + (data.childrenData.length + 1) * betweenSections;
    const deltaScaleZ = testamentDesiredScaleZ - testamentScales.z;

    const firstAnimations: Array<Promise<void>> = [
      AnimateStrictTag(testamentBot, "scaleZ", {
        fromValue: testamentScales.z,
        toValue: testamentDesiredScaleZ,
        duration: animationsDuration,
        easing: animationsEasing,
        tagMaskSpace: false,
      }),
    ];

    const focusPosition = {
      x: testamentPosition.x,
      y: testamentPosition.y,
      z: testamentPosition.z + testamentDesiredScaleZ / 2,
    };
    const bibleId = data.getParentId("stackBibleId");
    if (bibleId) {
      const transformerId = testamentBot.tags.transformer;
      if (transformerId) {
        const transformerBot = getBot(byID(transformerId));
        if (transformerBot) {
          const transformerPosition = getBotPosition(transformerBot, dimension);
          focusPosition.x += transformerPosition.x;
          focusPosition.y += transformerPosition.y;
          focusPosition.z += transformerPosition.z;
        }
      }
    }
    this.#cameraAdapterPort.focusOn(focusPosition, "testamentSelection");

    // Reposition everything sitting above the testament by the delta it grew.
    const bibleData = bibleId
      ? this.#bibleDataRepository.getBibleDataById(bibleId)
      : undefined;
    if (bibleData) {
      const piecesAbove = this.#getPiecesAboveTestament(
        bibleData,
        data.getTestamentIndex(),
        testamentPosition.z,
        dimension
      );
      for (const pieceAbove of piecesAbove) {
        const bot = this.#pieceMapper.toInfrastructure(pieceAbove);
        if (!bot) {
          throw new Error(
            "TestamentSelectionAdapter: bot not found at select."
          );
        }
        const pieceDesiredPositionZ =
          getBotPosition(bot, dimension).z + deltaScaleZ;
        this.#tryRegisterDesiredPositionZ(pieceAbove, pieceDesiredPositionZ);
        firstAnimations.push(
          AnimateStrictTag(bot, (dimension + "Z") as keyof PieceBotTags, {
            toValue: pieceDesiredPositionZ,
            duration: animationsDuration,
            easing: animationsEasing,
            tagMaskSpace: false,
          })
        );
      }
    }

    await Promise.allSettled(firstAnimations);

    // 3. Reveal each section at its final depth/position now the testament grew.
    for (const layout of layouts.values()) {
      SetStrictTag(layout.bot, "scaleZ", layout.desiredScaleZ);
      SetStrictTag(
        layout.bot,
        (dimension + "Z") as keyof PieceBotTags,
        layout.desiredPositionZ
      );
    }

    // 4. Refresh the render order of the active bible pieces now depths changed.
    this.#renderOrderAdapterPort.setSortedRenderOrder(this.#getActivePieces());

    // 5. Fade the testament out; the sections now own the surface.
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
      tagMaskSpace: false,
    });
    SetStrictTag(testamentBot, "color", "clear");
    SetStrictTag(testamentBot, "pointable", false);
  }

  #getPiecesAboveTestament(
    bibleData: StackBibleData,
    testamentIndex: number,
    testamentPositionZ: number,
    dimension: string
  ): Piece[] {
    const pieces: Piece[] = [];

    const upperCover = bibleData.getStaticPiece("upperCover");
    if (upperCover) pieces.push(upperCover);

    const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
    const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
    for (const crossLine of [verticalLine, horizontalLine]) {
      if (
        crossLine &&
        this.#isPieceAbove(crossLine, testamentPositionZ, dimension)
      ) {
        pieces.push(crossLine);
      }
    }

    for (const sectionData of bibleData.getAllSectionsData()) {
      if (!(sectionData instanceof StackSectionData)) continue;
      const shadow = sectionData.shadow;
      if (shadow && this.#isPieceAbove(shadow, testamentPositionZ, dimension)) {
        pieces.push(shadow);
      }
    }

    const testaments = bibleData.childrenData;
    for (let i = testamentIndex + 1; i < testaments.length; i++) {
      const testamentData = testaments[i];
      if (!testamentData) continue;
      if (testamentData.isSplitIntoSections) {
        for (const sectionData of testamentData.childrenData) {
          if (
            sectionData instanceof StackSectionData &&
            sectionData.isSplitIntoBooks
          ) {
            for (const bookData of sectionData.childrenData.flat()) {
              if (bookData.isActive && bookData.piece) {
                pieces.push(bookData.piece);
              }
            }
          } else if (sectionData.isActive && sectionData.piece) {
            pieces.push(sectionData.piece);
          }
        }
      } else if (testamentData.isActive && testamentData.piece) {
        pieces.push(testamentData.piece);
      }
    }

    return pieces;
  }

  #tryRegisterDesiredPositionZ(piece: Piece, desiredPositionZ: number): void {
    if (
      piece.type === "StackTestament" ||
      piece.type === "StackSection" ||
      piece.type === "StackSectionBook" ||
      piece.type === "StackBook"
    ) {
      this.#visualStateRegistry.registerStateProperty({
        piece: piece as Piece<
          "StackTestament" | "StackSection" | "StackSectionBook" | "StackBook"
        >,
        property: "desiredPositionZ",
        value: desiredPositionZ,
      });
    }
  }

  #isPieceAbove(
    piece: Piece,
    testamentPositionZ: number,
    dimension: string
  ): boolean {
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) return false;
    return getBotPosition(bot, dimension).z > testamentPositionZ;
  }

  #getActivePieces(): Piece[] {
    return [
      ...this.#pieceDataRepository.getAllTestaments(),
      ...this.#pieceDataRepository.getAllSections(),
      ...this.#pieceDataRepository.getAllSectionBooks(),
      ...this.#pieceDataRepository.getAllBooks(),
      ...this.#pieceDataRepository.getAllChapters(),
    ]
      .filter((pieceData) => pieceData.isPieceAvailable())
      .flatMap((pieceData) =>
        pieceData.piece !== undefined &&
        this.#pieceAdapter.isPieceBeingUsed(pieceData.piece)
          ? [pieceData.piece]
          : []
      );
  }
}
