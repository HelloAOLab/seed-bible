import type {
  BookStackUpdaterPort,
  UpdateCommand,
  BookVisualUpdateResult,
} from "@packages/Bible Stack/bibleStack/application/ports/out/StackBookUpdater";
import type { StackUpdateConfigProvider } from "../../config/stackUpdate/StackUpdateConfigProvider";
import type { LoggerPort } from "@packages/Bible Stack/bibleStack/application/ports/in/Logger";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { StackSectionBookMapper } from "../../mappers/StackSectionBookMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { BookStackLayoutAdapter } from "./BookStackLayoutAdapter";
import type { BookShapeAdapter } from "./BookShapeAdapter";
import type { SelectedBookLayoutAdapter } from "./SelectedBookLayoutAdapter";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { StackConfigProvider } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/config/stacks/StackConfigProvider";
import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { Easing } from "../../../../../../typings/AuxLibraryDefinitions";
import type { BookBot } from "@packages/Bible Stack/bibleStack/models/stack";
import type { BookLayout } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/canvas";
import { BookShape } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import { SelectionStates } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/selection";
import { FindPreviousValidGroupBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/functions/scripture";
import type {
  SetStrictTag,
  AnimateStrictTag,
} from "bibleVizUtils.infrastructure.functions.casualos";

type BookEntity = StackBookData | StackSectionBookData;

interface AdapterParams {
  getDimension: () => string;
  stackUpdateConfigProvider: StackUpdateConfigProvider;
  stackConfigProvider: StackConfigProvider;
  bookMapper: StackBookMapper;
  sectionBookMapper: StackSectionBookMapper;
  sectionMapper: StackSectionMapper;
  bookStackLayoutAdapter: BookStackLayoutAdapter;
  bookShapeAdapter: BookShapeAdapter;
  selectedBookLayoutAdapter: SelectedBookLayoutAdapter;
  visualStateRegistry: VisualStateRegistry;
  setStrictTag: typeof SetStrictTag;
  animateStrictTag: typeof AnimateStrictTag;
  loggerPort: LoggerPort;
}

interface BaseBookComputeParams {
  pacing: StackUpdatePacing;
  dimension: string;
  duration: number;
  easing: Easing;
  desiredPositionX: number;
  desiredPositionY: number;
  desiredPositionZ: number;
}

/**
 * A regular book. The section context is only present when the book is laid out
 * inside a section (exploded / group positioning); a standalone book omits it,
 * so it stays optional.
 */
interface RegularBookComputeParams extends BaseBookComputeParams {
  data: StackBookData;
  sectionData?: StackSectionData;
  bookDataArr?: BookEntity[];
  bookDataIndex?: number;
  selectedBooksTotalHeight?: number;
  selectedBooksTotalMargin?: number;
}

/** A single-book "section": never carries section-layout context. */
interface SectionBookComputeParams extends BaseBookComputeParams {
  data: StackSectionBookData;
}

type BookComputeParams = RegularBookComputeParams | SectionBookComputeParams;

const EMPTY_RESULT: BookVisualUpdateResult = {
  absBookDesiredPosition: undefined,
  halfInitialBookScales: undefined,
  selectedBookHeight: undefined,
  marginToAdd: 0,
  computedAnimations: [],
};

export class BookStackUpdaterAdapter implements BookStackUpdaterPort {
  #getDimension: AdapterParams["getDimension"];
  #stackUpdateConfigProvider: AdapterParams["stackUpdateConfigProvider"];
  #stackConfigProvider: AdapterParams["stackConfigProvider"];
  #bookMapper: AdapterParams["bookMapper"];
  #sectionBookMapper: AdapterParams["sectionBookMapper"];
  #sectionMapper: AdapterParams["sectionMapper"];
  #bookStackLayoutAdapter: AdapterParams["bookStackLayoutAdapter"];
  #bookShapeAdapter: AdapterParams["bookShapeAdapter"];
  #selectedBookLayoutAdapter: AdapterParams["selectedBookLayoutAdapter"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #setStrictTag: AdapterParams["setStrictTag"];
  #animateStrictTag: AdapterParams["animateStrictTag"];
  #loggerPort: AdapterParams["loggerPort"];

  constructor({
    getDimension,
    stackUpdateConfigProvider,
    stackConfigProvider,
    bookMapper,
    sectionBookMapper,
    sectionMapper,
    bookStackLayoutAdapter,
    bookShapeAdapter,
    selectedBookLayoutAdapter,
    visualStateRegistry,
    setStrictTag,
    animateStrictTag,
    loggerPort,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#stackUpdateConfigProvider = stackUpdateConfigProvider;
    this.#stackConfigProvider = stackConfigProvider;
    this.#bookMapper = bookMapper;
    this.#sectionBookMapper = sectionBookMapper;
    this.#sectionMapper = sectionMapper;
    this.#bookStackLayoutAdapter = bookStackLayoutAdapter;
    this.#bookShapeAdapter = bookShapeAdapter;
    this.#selectedBookLayoutAdapter = selectedBookLayoutAdapter;
    this.#visualStateRegistry = visualStateRegistry;
    this.#setStrictTag = setStrictTag;
    this.#animateStrictTag = animateStrictTag;
    this.#loggerPort = loggerPort;
  }

  #toBot(data: BookEntity): BookBot | undefined {
    if (!data.piece) return undefined;
    return data.type === "StackSectionBook"
      ? this.#sectionBookMapper.toInfrastructure(data.piece)
      : this.#bookMapper.toInfrastructure(data.piece);
  }

  /** Standalone book update: derive position from the book's own bot position. */
  async update({ data, pacing }: UpdateCommand): Promise<void> {
    const dimension = this.#getDimension();
    const duration = this.#stackUpdateConfigProvider.getDuration(pacing);
    const easing = this.#stackUpdateConfigProvider.getEasing();

    const bot = this.#toBot(data);
    if (!bot) {
      this.#loggerPort.error("BookStackUpdaterAdapter: book bot not found");
      return;
    }

    const position = getBotPosition(bot, dimension);
    const common = {
      pacing,
      dimension,
      duration,
      easing,
      desiredPositionX: position.x,
      desiredPositionY: position.y,
      desiredPositionZ: position.z,
    };
    const { computedAnimations } =
      data.type === "StackSectionBook"
        ? this.#updateSectionBook({ data, ...common })
        : this.#updateBook({ data, ...common });

    await Promise.allSettled(computedAnimations);
  }

  /** Switchboard: route by piece type to the matching renderer. */
  computeVisualUpdate(params: BookComputeParams): BookVisualUpdateResult {
    return this.#isSectionBookParams(params)
      ? this.#updateSectionBook(params)
      : this.#updateBook(params);
  }

  #isSectionBookParams(
    params: BookComputeParams
  ): params is SectionBookComputeParams {
    return params.data.type === "StackSectionBook";
  }

  /**
   * A book laid out standalone or inside a section. When section context is
   * supplied (sectionData), applies exploded-view / group-book positioning.
   */
  #updateBook(params: RegularBookComputeParams): BookVisualUpdateResult {
    const {
      data,
      pacing,
      dimension,
      duration,
      easing,
      sectionData,
      bookDataArr = [],
      bookDataIndex = 0,
      selectedBooksTotalHeight = 0,
      selectedBooksTotalMargin = 0,
    } = params;

    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error(
        "BookStackUpdaterAdapter: book piece not defined at updateBook"
      );
      return { ...EMPTY_RESULT };
    }
    const bot = this.#bookMapper.toInfrastructure(piece);
    if (!bot) {
      this.#loggerPort.error(
        "BookStackUpdaterAdapter: book bot not found at updateBook"
      );
      return { ...EMPTY_RESULT };
    }

    const isInstantaneous = pacing === "Instant";
    const isSelected = data.selectionState === SelectionStates.Selected;
    const isInExplodedView = sectionData?.isInExplodedView ?? false;
    const layout = this.#selectedBookLayoutAdapter.computeLayout(data);
    const selectedBookHeight = layout.height;
    const sectionInitialScale = this.#getSectionInitialScale(sectionData);

    const computedAnimations: Array<Promise<void>> = [];
    let desiredPositionX = params.desiredPositionX;
    let desiredPositionY = params.desiredPositionY;
    let desiredPositionZ = params.desiredPositionZ;
    const initialDesiredPositionX = desiredPositionX;
    const initialDesiredPositionY = desiredPositionY;
    let marginToAdd = 0;

    // --- Shape + selection-driven state -------------------------------------
    if (isSelected) {
      if (layout.columns !== undefined) {
        this.#visualStateRegistry.registerStateProperty({
          piece,
          property: "chapterColumns",
          value: layout.columns,
        });
      }
      if (layout.rows !== undefined) {
        this.#visualStateRegistry.registerStateProperty({
          piece,
          property: "chapterRows",
          value: layout.rows,
        });
      }
      if (selectedBookHeight !== undefined) {
        this.#visualStateRegistry.registerStateProperty({
          piece,
          property: "explodedViewSelectedScaleZ",
          value: selectedBookHeight,
        });
      }
      this.#setStrictTag(bot, "pointable", !!sectionData && !isInExplodedView);
      // NOTE: chapter hide/show is orchestrated by BookStackUpdaterService.
      computedAnimations.push(
        this.#bookShapeAdapter
          .trySetShape({
            data,
            bot,
            shape:
              !sectionData || isInExplodedView
                ? BookShape.Selected
                : BookShape.RegularSelected,
            pacing,
            sectionInitialScale,
          })
          .then(() => {})
      );
    } else {
      computedAnimations.push(
        this.#bookShapeAdapter
          .trySetShape({
            data,
            bot,
            shape: isInExplodedView
              ? BookShape.ExplodedView
              : BookShape.Regular,
            pacing,
            sectionInitialScale,
          })
          .then(() => {})
      );
    }

    // --- Position math (only relevant inside a section) ---------------------
    let absBookDesiredPosition: { x: number; y: number } | undefined;
    let halfInitialBookScales: { x: number; y: number } | undefined;

    if (sectionData) {
      const desiredScaleZ = this.#visualStateRegistry.getStateProperty({
        piece,
        property: "desiredScaleZ",
      });

      if (isInExplodedView) {
        const explodedViewPosition = this.#visualStateRegistry.getStateProperty(
          {
            piece,
            property: "explodedViewPosition",
          }
        );
        const sectionDesiredExplodedViewScaleZ = sectionData.piece
          ? this.#visualStateRegistry.getStateProperty({
              piece: sectionData.piece,
              property: "desiredExplodedViewScaleZ",
            })
          : 0;

        desiredPositionZ +=
          explodedViewPosition.z * sectionDesiredExplodedViewScaleZ -
          desiredScaleZ / 2 +
          selectedBooksTotalHeight +
          selectedBooksTotalMargin;

        if (isSelected) {
          const selectedBookMargin =
            this.#stackConfigProvider.getStackSpacing("SelectedBookMargin");
          desiredPositionZ += selectedBookMargin;
          marginToAdd += selectedBookMargin * 2;
          if (bookDataIndex > 0) {
            const previous = FindPreviousValidGroupBookData({
              arr: bookDataArr,
              currentIndex: bookDataIndex,
            });
            if (previous) {
              const previousDesiredPositionZ =
                this.#visualStateRegistry.getStateProperty({
                  piece: previous.piece,
                  property: "desiredPositionZ",
                });
              const previousDesiredScaleZ =
                this.#visualStateRegistry.getStateProperty({
                  piece: previous.piece,
                  property: "desiredScaleZ",
                });
              const tempBookDesiredPositionZ =
                previousDesiredPositionZ +
                previousDesiredScaleZ +
                selectedBookMargin;
              if (tempBookDesiredPositionZ > desiredPositionZ) {
                marginToAdd += tempBookDesiredPositionZ - desiredPositionZ;
                desiredPositionZ = tempBookDesiredPositionZ;
              }
            }
          }
        } else {
          const sectionScales =
            this.#stackConfigProvider.getStackPieceMeasurement("SectionScales");
          desiredPositionX += explodedViewPosition.x * sectionScales.x;
          desiredPositionY += explodedViewPosition.y * sectionScales.y;
        }
      } else if (this.#isGroupBook(data)) {
        const groupLayoutPosition = this.#computeGroupBookLayoutPosition({
          sectionData,
          bookDataArr,
          bookDataIndex,
          dimension,
        });
        if (groupLayoutPosition) {
          desiredPositionX += groupLayoutPosition.x;
          desiredPositionY += groupLayoutPosition.y;
        }
      }

      absBookDesiredPosition = {
        x: Math.abs(desiredPositionX - initialDesiredPositionX),
        y: Math.abs(desiredPositionY - initialDesiredPositionY),
      };
      const initialScaleX = this.#visualStateRegistry.getStateProperty({
        piece,
        property: "initialScaleX",
      });
      const initialScaleY = this.#visualStateRegistry.getStateProperty({
        piece,
        property: "initialScaleY",
      });
      halfInitialBookScales = { x: initialScaleX / 2, y: initialScaleY / 2 };
    }

    // --- Persist position + animate -----------------------------------------
    this.#visualStateRegistry.registerStateProperty({
      piece,
      property: "desiredPositionZ",
      value: desiredPositionZ,
    });
    computedAnimations.push(
      ...this.#writePosition(
        bot,
        dimension,
        desiredPositionX,
        desiredPositionY,
        desiredPositionZ,
        isInstantaneous,
        duration,
        easing
      )
    );

    return {
      absBookDesiredPosition,
      halfInitialBookScales,
      selectedBookHeight,
      marginToAdd,
      computedAnimations,
    };
  }

  /**
   * A single-book "section" (StackSectionBook): no exploded/group positioning —
   * just its shape, desired Z scale, and placement at the supplied position.
   */
  #updateSectionBook(params: SectionBookComputeParams): BookVisualUpdateResult {
    const {
      data,
      pacing,
      dimension,
      duration,
      easing,
      desiredPositionX,
      desiredPositionY,
      desiredPositionZ,
    } = params;

    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error(
        "BookStackUpdaterAdapter: section-book piece not defined at updateSectionBook"
      );
      return { ...EMPTY_RESULT };
    }
    const bot = this.#sectionBookMapper.toInfrastructure(piece);
    if (!bot) {
      this.#loggerPort.error(
        "BookStackUpdaterAdapter: section-book bot not found at updateSectionBook"
      );
      return { ...EMPTY_RESULT };
    }

    const isInstantaneous = pacing === "Instant";
    const isSelected = data.selectionState === SelectionStates.Selected;
    const layout = this.#selectedBookLayoutAdapter.computeLayout(data);
    const selectedBookHeight = layout.height;
    const computedAnimations: Array<Promise<void>> = [];

    if (isSelected) {
      if (layout.columns !== undefined) {
        this.#visualStateRegistry.registerStateProperty({
          piece,
          property: "chapterColumns",
          value: layout.columns,
        });
      }
      if (layout.rows !== undefined) {
        this.#visualStateRegistry.registerStateProperty({
          piece,
          property: "chapterRows",
          value: layout.rows,
        });
      }
      if (selectedBookHeight !== undefined) {
        this.#visualStateRegistry.registerStateProperty({
          piece,
          property: "desiredScaleZ",
          value: selectedBookHeight,
        });
      }
      computedAnimations.push(
        this.#bookShapeAdapter
          .trySetShape({ data, bot, shape: BookShape.Selected, pacing })
          .then(() => {})
      );
    } else {
      const initialScaleZ = this.#visualStateRegistry.getStateProperty({
        piece,
        property: "initialScaleZ",
      });
      this.#visualStateRegistry.registerStateProperty({
        piece,
        property: "desiredScaleZ",
        value: initialScaleZ,
      });
      computedAnimations.push(
        this.#bookShapeAdapter
          .trySetShape({ data, bot, shape: BookShape.Regular, pacing })
          .then(() => {})
      );
    }

    this.#visualStateRegistry.registerStateProperty({
      piece,
      property: "desiredPositionZ",
      value: desiredPositionZ,
    });
    computedAnimations.push(
      ...this.#writePosition(
        bot,
        dimension,
        desiredPositionX,
        desiredPositionY,
        desiredPositionZ,
        isInstantaneous,
        duration,
        easing
      )
    );

    return {
      absBookDesiredPosition: undefined,
      halfInitialBookScales: undefined,
      selectedBookHeight,
      marginToAdd: 0,
      computedAnimations,
    };
  }

  /** Snaps or animates the book bot's X/Y/Z position; returns the animations. */
  #writePosition(
    bot: BookBot,
    dimension: string,
    x: number,
    y: number,
    z: number,
    isInstantaneous: boolean,
    duration: number,
    easing: Easing
  ): Array<Promise<void>> {
    if (isInstantaneous) {
      this.#setStrictTag(bot, (dimension + "X") as keyof typeof bot.tags, x);
      this.#setStrictTag(bot, (dimension + "Y") as keyof typeof bot.tags, y);
      this.#setStrictTag(bot, (dimension + "Z") as keyof typeof bot.tags, z);
      return [];
    }
    const bookPosition = getBotPosition(bot, dimension);
    return [
      this.#animateStrictTag(bot, (dimension + "X") as keyof typeof bot.tags, {
        fromValue: bookPosition.x,
        toValue: x,
        duration,
        easing,
      }),
      this.#animateStrictTag(bot, (dimension + "Y") as keyof typeof bot.tags, {
        fromValue: bookPosition.y,
        toValue: y,
        duration,
        easing,
      }),
      this.#animateStrictTag(bot, (dimension + "Z") as keyof typeof bot.tags, {
        fromValue: bookPosition.z,
        toValue: z,
        duration,
        easing,
      }),
    ];
  }

  #getSectionInitialScale(
    sectionData: StackSectionData | undefined
  ): { x: number; y: number } | undefined {
    if (!sectionData?.piece) return undefined;
    return {
      x: this.#visualStateRegistry.getStateProperty({
        piece: sectionData.piece,
        property: "initialScaleX",
      }),
      y: this.#visualStateRegistry.getStateProperty({
        piece: sectionData.piece,
        property: "initialScaleY",
      }),
    };
  }

  #isGroupBook(data: BookEntity): boolean {
    return data.type === "StackSectionBook"
      ? data.pieceBookInfo.group != null
      : data.pieceInfo.group != null;
  }

  #computeGroupBookLayoutPosition({
    sectionData,
    bookDataArr,
    bookDataIndex,
    dimension,
  }: {
    sectionData: StackSectionData;
    bookDataArr: BookEntity[];
    bookDataIndex: number;
    dimension: string;
  }): { x: number; y: number } | undefined {
    // The per-book group layout (x/y spans) still comes from the legacy runtime
    // shout (kept raw, like other below-book runtime calls). bookDataArr is the
    // book's level, so its length/index match the legacy `level`/`level.indexOf`.
    const layouts = thisBot.GetLayoutForBooksGroup({
      amountOfBooks: bookDataArr.length,
    }) as BookLayout[] | undefined;
    const bookLayout = layouts?.[bookDataIndex];
    if (!bookLayout || !sectionData.piece) return undefined;

    const sectionBot = this.#sectionMapper.toInfrastructure(sectionData.piece);
    const sectionPosition = sectionBot
      ? getBotPosition(sectionBot, dimension)
      : undefined;

    const { layoutPosition } =
      this.#bookStackLayoutAdapter.computeGroupBookProperties(
        bookLayout,
        sectionPosition,
        this.#stackConfigProvider.getStackPieceMeasurement("BookScales"),
        this.#stackConfigProvider.getStackSpacing("BetweenBooks")
      );
    return { x: layoutPosition.x, y: layoutPosition.y };
  }
}
