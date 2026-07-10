import { ApplyStrictMod } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/casualos";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { BookInfoMapper } from "../../mappers/BookInfoMapper";
import type { BookStackLayoutAdapter } from "./BookStackLayoutAdapter";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { StackConfigProvider } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/config/stacks/StackConfigProvider";
import type { LoggerPort } from "@packages/Bible Stack/bibleStack/application/ports/in/Logger";
import type { BookSetupConfigProvider } from "../../config/bookSetup/BookSetupConfigProvider";
import type { LayoutConfigurations } from "../../config/bookSetup/layouts";
import type { HexString } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/commonTypes";
import {
  GetChildrenLevelColors,
  GetDarkerColor,
  HexToRgb,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/functions/colors";

interface AdapterParams {
  getDimension: () => string;
  bookMapper: StackBookMapper;
  sectionMapper: StackSectionMapper;
  bookInfoMapper: BookInfoMapper;
  bookStackLayoutAdapter: BookStackLayoutAdapter;
  visualStateRegistry: VisualStateRegistry;
  stackConfigProvider: StackConfigProvider;
  bookSetupConfigProvider: BookSetupConfigProvider;
  loggerPort: LoggerPort;
}

/**
 * Configures a freshly spawned book bot for a section's exploded view: it
 * computes the book's visual state (scales, exploded position, desired Z) and
 * registers it in the VisualStateRegistry, then places the book at its initial
 * (collapsed) position so the selection cascade can animate it into place.
 *
 * This is the clean-architecture seed of the legacy `SpawnBook` visual setup.
 * NOTE: position-first — colors / labels are placeholders here and will be
 * filled in by a later step.
 */
export class BookSetupAdapter {
  #getDimension: AdapterParams["getDimension"];
  #bookMapper: AdapterParams["bookMapper"];
  #sectionMapper: AdapterParams["sectionMapper"];
  #bookInfoMapper: AdapterParams["bookInfoMapper"];
  #bookStackLayoutAdapter: AdapterParams["bookStackLayoutAdapter"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #stackConfigProvider: AdapterParams["stackConfigProvider"];
  #bookSetupConfigProvider: AdapterParams["bookSetupConfigProvider"];
  #loggerPort: AdapterParams["loggerPort"];

  constructor({
    getDimension,
    bookMapper,
    sectionMapper,
    bookInfoMapper,
    bookStackLayoutAdapter,
    visualStateRegistry,
    stackConfigProvider,
    bookSetupConfigProvider,
    loggerPort,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#bookMapper = bookMapper;
    this.#sectionMapper = sectionMapper;
    this.#bookInfoMapper = bookInfoMapper;
    this.#bookStackLayoutAdapter = bookStackLayoutAdapter;
    this.#visualStateRegistry = visualStateRegistry;
    this.#stackConfigProvider = stackConfigProvider;
    this.#bookSetupConfigProvider = bookSetupConfigProvider;
    this.#loggerPort = loggerPort;
  }

  /**
   * Registers the book's visual state and places it at its initial collapsed
   * position inside the (exploded) section.
   */
  setupBook({
    bookData,
    sectionData,
  }: {
    bookData: StackBookData;
    sectionData: StackSectionData;
  }): void {
    const piece = bookData.piece;
    if (!piece) {
      this.#loggerPort.error(
        "BookSetupAdapter: book piece not defined at setupBook"
      );
      return;
    }
    const bot = this.#bookMapper.toInfrastructure(piece);
    if (!bot) {
      this.#loggerPort.error(
        "BookSetupAdapter: book bot not found at setupBook"
      );
      return;
    }
    const sectionPiece = sectionData.piece;
    if (!sectionPiece) {
      this.#loggerPort.error(
        "BookSetupAdapter: section piece not defined at setupBook"
      );
      return;
    }
    const sectionBot = this.#sectionMapper.toInfrastructure(sectionPiece);
    if (!sectionBot) {
      this.#loggerPort.error(
        "BookSetupAdapter: section bot not found at setupBook"
      );
      return;
    }

    const dimension = this.#getDimension();
    const infraInfo = this.#bookInfoMapper.toInfrastructure(bookData.pieceInfo);
    const explodedViewPosition = infraInfo.explodedViewPosition ?? {
      x: 0,
      y: 0,
      z: 0,
    };
    const explodedViewCustomScale = infraInfo.explodedViewCustomScale;

    // --- level context -----------------------------------------------------
    const levels = sectionData.childrenData;
    const level = levels.find((bookDataArr) => bookDataArr.includes(bookData));
    if (!level) {
      this.#loggerPort.error(
        "BookSetupAdapter: book level not found at setupBook"
      );
      return;
    }
    const chaptersInLevel = level.reduce(
      (total, currentBook) => total + currentBook.pieceInfo.numberOfChapters,
      0
    );

    // --- section visual state (already registered during the open sequence) -
    const sectionDesiredScaleZ = this.#visualStateRegistry.getStateProperty({
      piece: sectionPiece,
      property: "desiredScaleZ",
    });
    const sectionDesiredPositionZ = this.#visualStateRegistry.getStateProperty({
      piece: sectionPiece,
      property: "desiredPositionZ",
    });
    const sectionDesiredExplodedViewScaleZ =
      this.#visualStateRegistry.getStateProperty({
        piece: sectionPiece,
        property: "desiredExplodedViewScaleZ",
      });

    // --- config ------------------------------------------------------------
    const betweenBooks =
      this.#stackConfigProvider.getStackSpacing("BetweenBooks");
    const bookScales =
      this.#stackConfigProvider.getStackPieceMeasurement("BookScales");
    const additionalHover = this.#stackConfigProvider.getStackPieceMeasurement(
      "AditionalBookScaleOnHover"
    );
    const explodedShadowPadding = this.#stackConfigProvider.getStackSpacing(
      "ExplodedViewSectionShadowPadding"
    );

    // --- computed scale + position -----------------------------------------
    const desiredScaleZ = this.#bookStackLayoutAdapter.computeBookDesiredScaleZ(
      {
        sectionDesiredScaleZ,
        betweenBooks,
        levelsCount: levels.length,
        chaptersInLevel,
        sectionTotalChapters: sectionData.getCreationParam(
          "amountOfChaptersInSection"
        ),
      }
    );

    const groupScales = this.#isGroupBook(bookData)
      ? this.#computeGroupScales(level, bookData)
      : undefined;
    const initialScaleX = groupScales?.x ?? bookScales.x;
    const initialScaleY = groupScales?.y ?? bookScales.y;

    // --- colors (level gradient) -------------------------------------------
    const levelIndex = levels.indexOf(level);
    const sectionColorRGB = HexToRgb({
      hexColor: sectionData.pieceInfo.color as HexString,
    });
    const colorRange =
      this.#visualStateRegistry.getStateProperty({
        piece: sectionPiece,
        property: "customColorRange",
      }) ?? 70;
    const levelsColors = GetChildrenLevelColors({
      sectionColorRGB,
      colorRange,
      levelsLength: levels.length,
    });
    const levelColor =
      levelsColors[levelIndex] ?? (sectionData.pieceInfo.color as HexString);
    const bookColor = bookData.pieceInfo.customColor ?? levelColor;
    const labelTextColor =
      bookData.pieceInfo.customLabelColor ??
      levelsColors[Math.round(levelsColors.length * 0.4) - 1] ??
      levelColor;
    const increasedIntensityStrokeColor = GetDarkerColor(levelColor);

    const desiredPositionZ =
      sectionDesiredPositionZ +
      explodedViewPosition.z * sectionDesiredExplodedViewScaleZ -
      desiredScaleZ / 2 +
      (sectionData.isOnTheGround ? explodedShadowPadding : 0);

    // --- register the book's visual state ----------------------------------
    this.#visualStateRegistry.registerState({
      piece,
      state: {
        initialScaleX,
        initialScaleY,
        initialScaleZ: desiredScaleZ,
        hoveredScaleX: initialScaleX + additionalHover,
        hoveredScaleY: initialScaleY + additionalHover,
        hoveredFormOpacity: 1,
        unhoveredFormOpacity: 1,
        orginalColor: levelColor,
        initialColor: levelColor,
        labelTextColor,
        desiredScaleZ,
        desiredPositionZ,
        chapterColumns: 0,
        chapterRows: 0,
        explodedViewSelectedScaleZ: 0,
        explodedViewPosition: {
          x: explodedViewPosition.x,
          y: explodedViewPosition.y,
          z: explodedViewPosition.z,
        },
        singleBooksScales: { x: bookScales.x, y: bookScales.y },
        explodedViewCustomScale: explodedViewCustomScale
          ? { x: explodedViewCustomScale.x, y: explodedViewCustomScale.y }
          : undefined,
        increasedIntensityStrokeColor,
      },
    });

    // --- place the book at its initial (collapsed) position ----------------
    const sectionPosition = getBotPosition(sectionBot, dimension);
    const initialPositionZ =
      sectionDesiredPositionZ + sectionDesiredExplodedViewScaleZ / 2;

    ApplyStrictMod(bot, {
      scaleX: 0.1,
      scaleY: 0.1,
      scaleZ: 0.1,
      formOpacity: 1,
      color: bookColor,
      strokeColor: "clear",
      [dimension]: true,
      [dimension + "X"]: sectionPosition.x,
      [dimension + "Y"]: sectionPosition.y,
      [dimension + "Z"]: initialPositionZ,
    });
  }

  #isGroupBook(bookData: StackBookData): boolean {
    return bookData.pieceInfo.group != null;
  }

  #computeGroupScales(
    level: StackBookData[],
    bookData: StackBookData
  ): { x: number; y: number } | undefined {
    const groupBookIndex = level.indexOf(bookData);
    const layouts = this.#bookSetupConfigProvider.getLayout(
      level.length as LayoutConfigurations
    );
    const bookLayout = layouts?.[groupBookIndex];
    if (!bookLayout) return undefined;

    const { scale } = this.#bookStackLayoutAdapter.computeGroupBookProperties(
      bookLayout,
      undefined,
      this.#stackConfigProvider.getStackPieceMeasurement("BookScales"),
      this.#stackConfigProvider.getStackSpacing("BetweenBooks")
    );
    return { x: scale.x, y: scale.y };
  }
}
