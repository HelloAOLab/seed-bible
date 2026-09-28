import {
  AnimateStrictTag,
  GetBotScales,
  SetStrictTag,
} from "../../functions/casualos";
import type { SectionSelectionConfigProvider } from "../../config/sectionSelection/SectionSelectionConfigProvider";
import type { SectionSelectionAdapterPort } from "../../../application/ports/out/SectionSelection";
import { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { StackSectionShadowMapper } from "../../mappers/StackSectionShadowMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { SectionBot, SectionTags } from "../../models/stack";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { LayoutConfigProvider } from "../../config/layout/LayoutConfigProvider";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { BookSetupAdapter } from "./BookSetupAdapter";
import type { BookStackLayoutAdapter } from "./BookStackLayoutAdapter";
import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { CameraAdapterPort } from "../../../application/ports/bibleLifecycle";
import type { BibleDataRepository } from "./BibleDataRepository";
import type { PieceDataRepository } from "./PieceDataRepository";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { Piece } from "../../../domain/models/canvas";
import type { PieceBotTags } from "../../models/casualos";

interface AdapterParams {
  getDimension(): string;
  selectionConfigProvider: SectionSelectionConfigProvider;
  shadowMapper: StackSectionShadowMapper;
  sectionMapper: StackSectionMapper;
  visualStateRegistry: VisualStateRegistry;
  stackConfigProvider: LayoutConfigProvider;
  bookSetupAdapter: BookSetupAdapter;
  bookMapper: StackBookMapper;
  bookStackLayoutAdapter: BookStackLayoutAdapter;
  cameraAdapterPort: CameraAdapterPort;
  bibleDataRepository: BibleDataRepository;
  pieceDataRepository: PieceDataRepository;
  pieceMapper: PieceMapper;
}

export class SectionSelectionAdapter implements SectionSelectionAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #selectionConfigProvider: AdapterParams["selectionConfigProvider"];
  #shadowMapper: AdapterParams["shadowMapper"];
  #sectionMapper: AdapterParams["sectionMapper"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #stackConfigProvider: AdapterParams["stackConfigProvider"];
  #bookSetupAdapter: AdapterParams["bookSetupAdapter"];
  #bookMapper: AdapterParams["bookMapper"];
  #bookStackLayoutAdapter: AdapterParams["bookStackLayoutAdapter"];
  #cameraAdapterPort: AdapterParams["cameraAdapterPort"];
  #bibleDataRepository: AdapterParams["bibleDataRepository"];
  #pieceDataRepository: AdapterParams["pieceDataRepository"];
  #pieceMapper: AdapterParams["pieceMapper"];

  constructor({
    getDimension,
    selectionConfigProvider,
    shadowMapper,
    sectionMapper,
    visualStateRegistry,
    stackConfigProvider,
    bookSetupAdapter,
    bookMapper,
    bookStackLayoutAdapter,
    cameraAdapterPort,
    bibleDataRepository,
    pieceDataRepository,
    pieceMapper,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#selectionConfigProvider = selectionConfigProvider;
    this.#shadowMapper = shadowMapper;
    this.#sectionMapper = sectionMapper;
    this.#visualStateRegistry = visualStateRegistry;
    this.#stackConfigProvider = stackConfigProvider;
    this.#bookSetupAdapter = bookSetupAdapter;
    this.#bookMapper = bookMapper;
    this.#bookStackLayoutAdapter = bookStackLayoutAdapter;
    this.#cameraAdapterPort = cameraAdapterPort;
    this.#bibleDataRepository = bibleDataRepository;
    this.#pieceDataRepository = pieceDataRepository;
    this.#pieceMapper = pieceMapper;
  }

  /**
   * The inverse of `deselect`: the section "explodes" — a quick rotation
   * wiggle, then it rises to its exploded Z and expands its depth while
   * fading out, handing the surface over to the books that take its place.
   * Concurrently the camera focuses on the section and every piece stacked
   * above it lifts to make room for the growth.
   */
  async select(
    data: StackSectionData,
    pacing: StackUpdatePacing = "Regular"
  ): Promise<void> {
    if (!data.piece) {
      throw new Error(
        "SectionSelectionAdapter: data.piece not defined at select"
      );
    }
    const sectionBot = this.#sectionMapper.toInfrastructure(data.piece);
    if (!sectionBot) {
      throw new Error(
        "SectionSelectionAdapter: sectionBot not found at select"
      );
    }

    const dimension = this.#getDimension();
    const duration = this.#selectionConfigProvider.getDuration(pacing);
    const easing = this.#selectionConfigProvider.getEasing();

    const sectionPosition = getBotPosition(sectionBot, dimension);
    const currentScaleZ = GetBotScales(sectionBot).z;
    const desiredExplodedViewScaleZ =
      this.#visualStateRegistry.getStateProperty({
        piece: data.piece,
        property: "desiredExplodedViewScaleZ",
      });
    const explodedPadding = this.#stackConfigProvider.getStackSpacing(
      "ExplodedViewSectionPadding"
    );
    const sectionNewPositionZ =
      sectionPosition.z + (data.isOnTheGround ? 0 : explodedPadding);

    const zTag = (dimension + "Z") as keyof SectionTags;
    const wiggleTag = (dimension + "RotationZ") as keyof SectionTags;
    const wiggleKeyframes =
      this.#selectionConfigProvider.getWiggleRotationKeyframes();
    const wiggleDuration = duration / wiggleKeyframes.length;
    const sineIn: Easing = { type: "sinusoidal", mode: "in" };
    const sineOut: Easing = { type: "sinusoidal", mode: "out" };

    const wiggle = wiggleKeyframes.reduce<Promise<void>>(
      (chain, toValue, index) =>
        chain.then(() =>
          AnimateStrictTag(sectionBot, wiggleTag, {
            toValue,
            duration: wiggleDuration,
            easing: index === 0 ? sineIn : sineOut,
            tagMaskSpace: false,
          })
        ),
      Promise.resolve()
    );

    const firstAnimations: Array<Promise<void>> = [
      wiggle,
      AnimateStrictTag(sectionBot, zTag, {
        fromValue: sectionPosition.z,
        toValue: sectionNewPositionZ,
        duration,
        easing,
        tagMaskSpace: false,
      }),
      AnimateStrictTag(sectionBot, "scaleZ", {
        fromValue: currentScaleZ,
        toValue: desiredExplodedViewScaleZ,
        duration,
        easing,
        tagMaskSpace: false,
      }),
    ];

    this.#focusCameraOnSection(
      data,
      sectionBot,
      {
        x: sectionPosition.x,
        y: sectionPosition.y,
        z: sectionNewPositionZ + desiredExplodedViewScaleZ / 2,
      },
      dimension
    );

    // Lift every piece above the section by the extra depth it will occupy.
    const liftDelta =
      desiredExplodedViewScaleZ - currentScaleZ + explodedPadding * 2;
    const piecesAbove = this.#getPiecesAboveSection(
      data,
      sectionPosition.z,
      dimension
    );
    for (const pieceAbove of piecesAbove) {
      const bot = this.#pieceMapper.toInfrastructure(pieceAbove);
      if (!bot) {
        throw new Error("SectionSelectionAdapter: bot not found at select.");
      }
      const pieceDesiredPositionZ =
        getBotPosition(bot, dimension).z + liftDelta;
      this.#tryRegisterDesiredPositionZ(pieceAbove, pieceDesiredPositionZ);
      firstAnimations.push(
        AnimateStrictTag(bot, (dimension + "Z") as keyof PieceBotTags, {
          toValue: pieceDesiredPositionZ,
          duration,
          easing,
          tagMaskSpace: false,
        })
      );
    }

    await Promise.all(firstAnimations);

    await AnimateStrictTag(sectionBot, "formOpacity", {
      fromValue: sectionBot.tags.formOpacity,
      toValue: 0,
      duration,
      easing: sineOut,
      tagMaskSpace: false,
    });

    SetStrictTag(sectionBot, "color", "clear");
    SetStrictTag(sectionBot, "pointable", false);

    await this.#cascadeBooks(data, sectionBot, pacing);
  }

  /**
   * Focuses the camera on the exploding section. When the section belongs to a
   * bible its position is relative to the bible transformer, so the focus point
   * is offset by the transformer's world position.
   */
  #focusCameraOnSection(
    data: StackSectionData,
    sectionBot: SectionBot,
    focusPosition: { x: number; y: number; z: number },
    dimension: string
  ): void {
    const bibleId = data.getParentId("stackBibleId");
    if (bibleId) {
      const transformerId = sectionBot.tags.transformer;
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
    this.#cameraAdapterPort.focusOn(focusPosition, "sectionSelection");
  }

  /**
   * Collects every active piece stacked above the exploding section: section
   * shadows sitting higher, the bible's upper cover and cross lines when above,
   * the sibling sections higher in the same testament, and every active piece
   * of the testaments stacked above.
   */
  #getPiecesAboveSection(
    data: StackSectionData,
    sectionPositionZ: number,
    dimension: string
  ): Piece[] {
    const pieces: Piece[] = [];

    const bibleId = data.getParentId("stackBibleId");
    const bibleData = bibleId
      ? this.#bibleDataRepository.getBibleDataById(bibleId)
      : undefined;
    const testamentData = this.#getContainingTestament(data, bibleData);

    // Section shadows sitting above the exploding section.
    const scopeSections = bibleData
      ? bibleData.getAllSectionsData()
      : (testamentData?.childrenData ?? []);
    for (const sectionData of scopeSections) {
      if (!(sectionData instanceof StackSectionData)) continue;
      const shadow = sectionData.shadow;
      if (shadow && this.#isPieceAbove(shadow, sectionPositionZ, dimension)) {
        pieces.push(shadow);
      }
    }

    // Static bible pieces above (only within a full bible).
    if (bibleData) {
      const upperCover = bibleData.getStaticPiece("upperCover");
      if (upperCover) pieces.push(upperCover);

      const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
      const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
      for (const crossLine of [verticalLine, horizontalLine]) {
        if (
          crossLine &&
          this.#isPieceAbove(crossLine, sectionPositionZ, dimension)
        ) {
          pieces.push(crossLine);
        }
      }
    }

    // Sibling sections higher in the same testament.
    if (testamentData) {
      const sectionIndex = testamentData.childrenData.indexOf(data);
      if (sectionIndex >= 0) {
        for (const sibling of testamentData.childrenData.slice(
          sectionIndex + 1
        )) {
          this.#pushActiveSectionPieces(sibling, pieces);
        }
      }
    }

    // Every active piece of the testaments stacked above.
    if (bibleData && testamentData) {
      const testaments = bibleData.childrenData;
      for (const higherTestament of testaments.slice(
        data.getTestamentIndex() + 1
      )) {
        this.#pushActiveTestamentPieces(higherTestament, pieces);
      }
    }

    return pieces;
  }

  #getContainingTestament(
    data: StackSectionData,
    bibleData: ReturnType<BibleDataRepository["getBibleDataById"]>
  ): StackTestamentData | undefined {
    if (bibleData) {
      return bibleData.childrenData[data.getTestamentIndex()];
    }
    const testamentId = data.getParentId("stackTestamentId");
    if (!testamentId) return undefined;
    return this.#pieceDataRepository
      .getAllTestaments()
      .find((testamentData) => testamentData.id === testamentId);
  }

  #pushActiveSectionPieces(
    sectionData: StackSectionData | StackSectionBookData,
    pieces: Piece[]
  ): void {
    if (
      sectionData instanceof StackSectionData &&
      sectionData.isSplitIntoBooks
    ) {
      for (const bookData of sectionData.childrenData.flat()) {
        if (bookData.isActive && bookData.piece) pieces.push(bookData.piece);
      }
    } else if (sectionData.isActive && sectionData.piece) {
      pieces.push(sectionData.piece);
    }
  }

  #pushActiveTestamentPieces(
    testamentData: StackTestamentData,
    pieces: Piece[]
  ): void {
    if (testamentData.isSplitIntoSections) {
      for (const sectionData of testamentData.childrenData) {
        this.#pushActiveSectionPieces(sectionData, pieces);
      }
    } else if (testamentData.isActive && testamentData.piece) {
      pieces.push(testamentData.piece);
    }
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
    sectionPositionZ: number,
    dimension: string
  ): boolean {
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) return false;
    return getBotPosition(bot, dimension).z > sectionPositionZ;
  }

  /**
   * Books appear in a staggered cascade: each active book is set up at its
   * collapsed initial position, then animated out to its desired exploded
   * position one after another.
   */
  async #cascadeBooks(
    data: StackSectionData,
    sectionBot: SectionBot,
    pacing: StackUpdatePacing
  ): Promise<void> {
    const dimension = this.#getDimension();
    const duration = this.#selectionConfigProvider.getDuration(pacing);
    const easing = this.#selectionConfigProvider.getEasing();
    const staggerMs =
      this.#selectionConfigProvider.getBookEntranceStaggerMs(pacing);

    if (!data.piece) return;
    const sectionInitialScaleX = this.#visualStateRegistry.getStateProperty({
      piece: data.piece,
      property: "initialScaleX",
    });
    const sectionInitialScaleY = this.#visualStateRegistry.getStateProperty({
      piece: data.piece,
      property: "initialScaleY",
    });
    const sectionPosition = getBotPosition(sectionBot, dimension);

    const orderedBooks = data.getReversedActiveBooks();

    // Set every book up first so all desired positions are registered.
    for (const bookData of orderedBooks) {
      this.#bookSetupAdapter.setupBook({ bookData, sectionData: data });
    }

    await Promise.all(
      orderedBooks.map((bookData, index) =>
        os.sleep(staggerMs * index).then(() =>
          this.#animateBookToDesiredPosition({
            bookData,
            dimension,
            sectionPosition,
            sectionInitialScaleX,
            sectionInitialScaleY,
            duration,
            easing,
          })
        )
      )
    );
  }

  /** Animates a single book from its current position to its exploded target. */
  async #animateBookToDesiredPosition({
    bookData,
    dimension,
    sectionPosition,
    sectionInitialScaleX,
    sectionInitialScaleY,
    duration,
    easing,
  }: {
    bookData: StackBookData;
    dimension: string;
    sectionPosition: { x: number; y: number; z: number };
    sectionInitialScaleX: number;
    sectionInitialScaleY: number;
    duration: number;
    easing: Easing;
  }): Promise<void> {
    const piece = bookData.piece;
    if (!piece) return;
    const bot = this.#bookMapper.toInfrastructure(piece);
    if (!bot) return;

    const explodedViewPosition = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "explodedViewPosition",
    });
    const explodedScales = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "explodedScales",
    });
    const desiredPositionZ = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "desiredPositionZ",
    });
    const unhoveredFormOpacity = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "unhoveredFormOpacity",
    });

    const target = this.#bookStackLayoutAdapter.computeExplodedBookPosition(
      { x: explodedViewPosition.x, y: explodedViewPosition.y },
      { x: sectionInitialScaleX, y: sectionInitialScaleY },
      { x: sectionPosition.x, y: sectionPosition.y }
    );
    const targetScaleX = explodedScales.x;
    const targetScaleY = explodedScales.y;

    const bookPosition = getBotPosition(bot, dimension);
    const bookScales = GetBotScales(bot);

    await AnimateStrictTag(bot, {
      fromValue: {
        [dimension + "X"]: bookPosition.x,
        [dimension + "Y"]: bookPosition.y,
        [dimension + "Z"]: bookPosition.z,
        scaleX: bookScales.x,
        scaleY: bookScales.y,
        scaleZ: bookScales.z,
        formOpacity: bot.tags.formOpacity,
      },
      toValue: {
        [dimension + "X"]: target.x,
        [dimension + "Y"]: target.y,
        [dimension + "Z"]: desiredPositionZ,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        scaleZ: explodedScales.z,
        formOpacity: unhoveredFormOpacity,
      },
      duration,
      easing,
      tagMaskSpace: false,
    });

    SetStrictTag(bot, "pointable", true);
  }

  async deselect(data: StackSectionData): Promise<void> {
    if (!data.shadow) {
      throw new Error(
        "SectionSelectionAdapter: data.shadow not defined at deselect"
      );
    }
    const shadowBot = this.#shadowMapper.toInfrastructure(data.shadow);

    if (!shadowBot) {
      throw new Error(
        "SectionSelectionAdapter: shadowBot not found at deselect"
      );
    }

    const dimension = this.#getDimension();
    const sectionShadowPosition = getBotPosition(shadowBot, dimension);
    const sectionShadowScales = GetBotScales(shadowBot);

    const desiredScale = this.#selectionConfigProvider.getDesiredScale();
    const desiredFormOpacity =
      this.#selectionConfigProvider.getDesiredFormOpacity();
    const duration = this.#selectionConfigProvider.getDuration();
    const easing = this.#selectionConfigProvider.getEasing();

    const sectionInitialScales = {
      x: sectionShadowScales.x * 1.1,
      y: sectionShadowScales.y * 1.1,
      z: sectionShadowScales.z * 1.1,
    };
    const deltaScaleZ = sectionInitialScales.z - sectionShadowScales.z;
    const sectionInitialPosition = new Vector3(
      sectionShadowPosition.x,
      sectionShadowPosition.y,
      sectionShadowPosition.z - deltaScaleZ / 2
    );

    if (!data.piece) {
      throw new Error(
        "SectionSelectionAdapter: data.piece not defined at deselect"
      );
    }
    const sectionBot = this.#sectionMapper.toInfrastructure(data.piece);
    if (!sectionBot) {
      throw new Error(
        "SectionSelectionAdapter: sectionBot not found at deselect"
      );
    }

    SetStrictTag(
      sectionBot,
      (dimension + "X") as keyof SectionTags,
      sectionInitialPosition.x
    );
    SetStrictTag(
      sectionBot,
      (dimension + "Y") as keyof SectionTags,
      sectionInitialPosition.y
    );
    SetStrictTag(
      sectionBot,
      (dimension + "Z") as keyof SectionTags,
      sectionInitialPosition.z
    );
    SetStrictTag(sectionBot, "scale", desiredScale);
    SetStrictTag(sectionBot, "scaleX", sectionInitialScales.x);
    SetStrictTag(sectionBot, "scaleY", sectionInitialScales.y);
    SetStrictTag(sectionBot, "scaleZ", sectionInitialScales.z);
    SetStrictTag(sectionBot, "color", data.paintColor ?? data.pieceInfo.color);
    SetStrictTag(sectionBot, "pointable", true);

    await AnimateStrictTag(sectionBot, {
      fromValue: {
        [dimension + "Z"]: sectionInitialPosition.z,
        scaleX: sectionInitialScales.x,
        scaleY: sectionInitialScales.y,
        scaleZ: sectionInitialScales.z,
        formOpacity: sectionBot.tags.formOpacity,
      },
      toValue: {
        [dimension + "Z"]: sectionShadowPosition.z,
        scaleX: sectionShadowScales.x,
        scaleY: sectionShadowScales.y,
        scaleZ: sectionShadowScales.z,
        formOpacity: desiredFormOpacity,
      },
      duration,
      easing,
      tagMaskSpace: false,
    });
  }
}
