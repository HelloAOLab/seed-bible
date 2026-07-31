import type { SectionStackUpdaterPort } from "@packages/Bible Stack/bibleStack/application/ports/out/StackSectionUpdater";
import type { StackUpdateConfigProvider } from "../../config/stackUpdate/StackUpdateConfigProvider";
import type { LoggerPort } from "@packages/Bible Stack/bibleStack/application/ports/in/Logger";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { StackSectionShadowMapper } from "../../mappers/StackSectionShadowMapper";
import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { Easing } from "../../../../../../typings/AuxLibraryDefinitions";
import type { StackConfigProvider } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/config/stacks/StackConfigProvider";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { BookStackUpdaterAdapter } from "./BookStackUpdaterAdapter";
import type { SectionBot } from "@packages/Bible Stack/bibleStack/models/stack";
import type { PieceBot } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/casualos";
import type { Scales } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/layout";
import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type {
  SetStrictTag,
  ApplyStrictMod,
  AnimateStrictTag,
} from "bibleVizUtils.infrastructure.functions.casualos";

interface AdapterParams {
  getDimension: () => string;
  stackUpdateConfigProvider: StackUpdateConfigProvider;
  stackConfigProvider: StackConfigProvider;
  sectionMapper: StackSectionMapper;
  sectionShadowMapper: StackSectionShadowMapper;
  bookStackUpdaterAdapter: BookStackUpdaterAdapter;
  visualStateRegistry: VisualStateRegistry;
  getBotScales: (bot: PieceBot) => Scales;
  setStrictTag: typeof SetStrictTag;
  applyStrictMod: typeof ApplyStrictMod;
  animateStrictTag: typeof AnimateStrictTag;
  loggerPort: LoggerPort;
}

/**
 * Shared context derived once in `computeVisualUpdate` and handed down to the
 * branch renderers so they don't each re-map the bot / re-read the position.
 */
interface SectionUpdateContext {
  sectionPiece: Piece<"StackSection">;
  sectionBot: SectionBot;
  sectionPosition: { x: number; y: number; z: number };
  desiredPositionZ: number;
  pacing: StackUpdatePacing;
  dimension: string;
  duration: number;
  easing: Easing;
  isInstantaneous: boolean;
}

/** Per-book layout results accumulated by the split-section book loop. */
interface SectionShadowBoundsInput {
  sectionPiece: Piece<"StackSection">;
  desiredPositionZ: number;
  maxBookExtentX: number;
  maxBookExtentY: number;
  selectedBooksTotalHeight: number;
  selectedBooksTotalMargin: number;
}

interface SectionShadowBounds {
  x: number;
  y: number;
  z: number;
  sectionShadowDesiredPositionZ: number;
}

export class SectionStackUpdaterAdapter implements SectionStackUpdaterPort {
  #getDimension: AdapterParams["getDimension"];
  #stackUpdateConfigProvider: AdapterParams["stackUpdateConfigProvider"];
  #stackConfigProvider: AdapterParams["stackConfigProvider"];
  #sectionMapper: AdapterParams["sectionMapper"];
  #sectionShadowMapper: AdapterParams["sectionShadowMapper"];
  #bookStackUpdaterAdapter: AdapterParams["bookStackUpdaterAdapter"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #getBotScales: AdapterParams["getBotScales"];
  #setStrictTag: AdapterParams["setStrictTag"];
  #applyStrictMod: AdapterParams["applyStrictMod"];
  #animateStrictTag: AdapterParams["animateStrictTag"];
  #loggerPort: AdapterParams["loggerPort"];

  constructor({
    getDimension,
    stackUpdateConfigProvider,
    stackConfigProvider,
    sectionMapper,
    sectionShadowMapper,
    bookStackUpdaterAdapter,
    visualStateRegistry,
    getBotScales,
    setStrictTag,
    applyStrictMod,
    animateStrictTag,
    loggerPort,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#stackUpdateConfigProvider = stackUpdateConfigProvider;
    this.#stackConfigProvider = stackConfigProvider;
    this.#sectionMapper = sectionMapper;
    this.#sectionShadowMapper = sectionShadowMapper;
    this.#bookStackUpdaterAdapter = bookStackUpdaterAdapter;
    this.#visualStateRegistry = visualStateRegistry;
    this.#getBotScales = getBotScales;
    this.#setStrictTag = setStrictTag;
    this.#applyStrictMod = applyStrictMod;
    this.#animateStrictTag = animateStrictTag;
    this.#loggerPort = loggerPort;
  }

  async update({
    data,
    pacing,
  }: {
    data: StackSectionData;
    pacing: StackUpdatePacing;
  }): Promise<void> {
    const dimension = this.#getDimension();
    const duration = this.#stackUpdateConfigProvider.getDuration(pacing);
    const easing = this.#stackUpdateConfigProvider.getEasing();

    const sectionPiece = data.piece;
    if (!sectionPiece) {
      this.#loggerPort.error(
        "SectionStackUpdaterAdapter: section piece not defined"
      );
      return;
    }

    const sectionBot = this.#sectionMapper.toInfrastructure(sectionPiece);
    if (!sectionBot) {
      this.#loggerPort.error(
        "SectionStackUpdaterAdapter: sectionBot not found"
      );
      return;
    }

    const sectionPosition = getBotPosition(sectionBot, dimension);

    const { computedAnimations } = this.computeVisualUpdate({
      pacing,
      data,
      desiredPositionZ: sectionPosition.z,
      dimension,
      duration,
      easing,
    });

    await Promise.allSettled(computedAnimations);
  }

  /**
   * Switchboard: resolve the shared render context and route to the matching
   * branch renderer based on whether the section is split into books.
   */
  computeVisualUpdate({
    pacing,
    data,
    desiredPositionZ,
    dimension,
    duration,
    easing,
  }: {
    pacing: StackUpdatePacing;
    data: StackSectionData;
    desiredPositionZ: number;
    dimension: string;
    duration: number;
    easing: Easing;
  }): { computedAnimations: Array<Promise<void>>; deltaPositionZ: number } {
    const sectionPiece = data.piece;
    if (!sectionPiece) {
      this.#loggerPort.error(
        "SectionStackUpdaterAdapter: section piece not defined at computeVisualUpdate"
      );
      return { computedAnimations: [], deltaPositionZ: 0 };
    }

    const sectionBot = this.#sectionMapper.toInfrastructure(sectionPiece);
    if (!sectionBot) {
      this.#loggerPort.error(
        "SectionStackUpdaterAdapter: sectionBot not found at computeVisualUpdate"
      );
      return { computedAnimations: [], deltaPositionZ: 0 };
    }

    const context: SectionUpdateContext = {
      sectionPiece,
      sectionBot,
      sectionPosition: getBotPosition(sectionBot, dimension),
      desiredPositionZ,
      pacing,
      dimension,
      duration,
      easing,
      isInstantaneous: pacing === "Instant",
    };

    if (data.isSplitIntoBooks) {
      return this.#updateSplitSection(data, context);
    }

    return this.#updateSolidSection(data, context);
  }

  /**
   * Split section: lays out each active book (legacy book handler), then sizes
   * and positions the section shadow (assumed already attached by the service).
   */
  #updateSplitSection(
    data: StackSectionData,
    context: SectionUpdateContext
  ): { computedAnimations: Array<Promise<void>>; deltaPositionZ: number } {
    const {
      sectionPiece,
      sectionPosition,
      desiredPositionZ,
      pacing,
      dimension,
      duration,
      easing,
    } = context;

    const computedAnimations: Array<Promise<void>> = [];
    const activeBooksInsideSection = data.getActiveBooks();
    let selectedBooksTotalHeight = 0;
    let selectedBooksTotalMargin = 0;
    let maxBookExtentX = 0;
    let maxBookExtentY = 0;

    let nextPositionZ = desiredPositionZ;
    nextPositionZ += data.isOnTheGround
      ? 0
      : data.isInExplodedView
        ? this.#stackConfigProvider.getStackSpacing(
            "ExplodedViewSectionPadding"
          )
        : this.#stackConfigProvider.getStackSpacing("BetweenBooks");

    for (const bookDataArr of data.childrenData) {
      for (const bookData of bookDataArr) {
        const bookDataIndex = bookDataArr.indexOf(bookData);
        if (bookData.isActive) {
          // Per-book layout is delegated to the book render adapter.
          const {
            absBookDesiredPosition,
            halfInitialBookScales,
            selectedBookHeight,
            marginToAdd,
            computedAnimations: bookAnimations,
          } = this.#bookStackUpdaterAdapter.computeVisualUpdate({
            data: bookData,
            pacing,
            dimension,
            duration,
            easing,
            bookDataArr,
            bookDataIndex,
            sectionData: data,
            selectedBooksTotalHeight,
            selectedBooksTotalMargin,
            desiredPositionX: sectionPosition.x,
            desiredPositionY: sectionPosition.y,
            desiredPositionZ:
              nextPositionZ +
              (data.isOnTheGround
                ? this.#stackConfigProvider.getStackSpacing(
                    "SectionShadowPadding"
                  )
                : 0),
          });

          computedAnimations.push(...bookAnimations);
          maxBookExtentX = Math.max(
            maxBookExtentX,
            (absBookDesiredPosition?.x ?? 0) + (halfInitialBookScales?.x ?? 0)
          );
          maxBookExtentY = Math.max(
            maxBookExtentY,
            (absBookDesiredPosition?.y ?? 0) + (halfInitialBookScales?.y ?? 0)
          );
          if (selectedBookHeight) {
            selectedBooksTotalHeight += selectedBookHeight;
            selectedBooksTotalMargin += marginToAdd;
          }
        }
      }

      if (
        bookDataArr.some((bookData) => bookData.isActive) &&
        !data.isInExplodedView
      ) {
        const activeBookPiece = bookDataArr.find(
          (bookData) => bookData.isActive && !!bookData.piece
        )?.piece;
        if (activeBookPiece) {
          nextPositionZ +=
            this.#visualStateRegistry.getStateProperty({
              piece: activeBookPiece,
              property: "desiredScaleZ",
            }) + this.#stackConfigProvider.getStackSpacing("BetweenBooks");
        }
      }
    }

    const bounds = this.#calculateSectionShadowBounds(
      data,
      activeBooksInsideSection,
      {
        sectionPiece,
        desiredPositionZ,
        maxBookExtentX,
        maxBookExtentY,
        selectedBooksTotalHeight,
        selectedBooksTotalMargin,
      }
    );

    this.#renderSectionShadow(data, context, bounds, {
      computedAnimations,
      activeBooksCount: activeBooksInsideSection.length,
    });

    if (activeBooksInsideSection.length === 0) {
      nextPositionZ = bounds.sectionShadowDesiredPositionZ + bounds.z;
    } else if (data.isInExplodedView) {
      nextPositionZ +=
        this.#visualStateRegistry.getStateProperty({
          piece: sectionPiece,
          property: "desiredExplodedViewScaleZ",
        }) +
        this.#stackConfigProvider.getStackSpacing(
          "ExplodedViewSectionPadding"
        ) +
        selectedBooksTotalHeight +
        selectedBooksTotalMargin;
    }

    return {
      computedAnimations,
      deltaPositionZ: nextPositionZ - desiredPositionZ,
    };
  }

  /**
   * Solid section: the section piece itself is the rendered surface; scale it
   * to its desired dimensions and place it along Z.
   */
  #updateSolidSection(
    data: StackSectionData,
    context: SectionUpdateContext
  ): { computedAnimations: Array<Promise<void>>; deltaPositionZ: number } {
    const {
      sectionPiece,
      sectionBot,
      desiredPositionZ,
      dimension,
      duration,
      easing,
      isInstantaneous,
    } = context;

    const computedAnimations: Array<Promise<void>> = [];
    let nextPositionZ = desiredPositionZ;

    // NOTE: the legacy script also handled a `StackSectionBookData` here (a section
    // that is really a single book). In the new architecture standalone
    // section-books flow through the Book updater
    // (getStandaloneSectionBooks -> bookStackUpdaterPort), so that branch is
    // intentionally not part of the section adapter.
    if (data.isActive) {
      const sectionCurrentScales = this.#getBotScales(sectionBot);
      const sectionScales =
        this.#stackConfigProvider.getStackPieceMeasurement("SectionScales");
      const sectionDesiredScaleZ = this.#visualStateRegistry.getStateProperty({
        piece: sectionPiece,
        property: "desiredScaleZ",
      });
      const sectionDesiredScales = new Vector3(
        sectionScales.x,
        sectionScales.y,
        sectionDesiredScaleZ
      );
      const setScaleX = sectionCurrentScales.x != sectionDesiredScales.x;
      const setScaleY = sectionCurrentScales.y != sectionDesiredScales.y;
      const setScaleZ = sectionCurrentScales.z != sectionDesiredScales.z;
      const unhoveredFormOpacity = this.#visualStateRegistry.getStateProperty({
        piece: sectionPiece,
        property: "unhoveredFormOpacity",
      });
      const setFormOpacity =
        sectionBot.tags.formOpacity != unhoveredFormOpacity;

      if (isInstantaneous) {
        if (setScaleX)
          this.#setStrictTag(sectionBot, "scaleX", sectionDesiredScales.x);
        if (setScaleY)
          this.#setStrictTag(sectionBot, "scaleY", sectionDesiredScales.y);
        if (setScaleZ)
          this.#setStrictTag(sectionBot, "scaleZ", sectionDesiredScales.z);
        if (setFormOpacity)
          this.#setStrictTag(sectionBot, "formOpacity", unhoveredFormOpacity);
      } else {
        if (setScaleX)
          computedAnimations.push(
            this.#animateStrictTag(sectionBot, "scaleX", {
              fromValue: sectionCurrentScales.x,
              toValue: sectionDesiredScales.x,
              duration,
              easing,
            })
          );
        if (setScaleY)
          computedAnimations.push(
            this.#animateStrictTag(sectionBot, "scaleY", {
              fromValue: sectionCurrentScales.y,
              toValue: sectionDesiredScales.y,
              duration,
              easing,
            })
          );
        if (setScaleZ)
          computedAnimations.push(
            this.#animateStrictTag(sectionBot, "scaleZ", {
              fromValue: sectionCurrentScales.z,
              toValue: sectionDesiredScales.z,
              duration,
              easing,
            })
          );
        if (setFormOpacity)
          computedAnimations.push(
            this.#animateStrictTag(sectionBot, "formOpacity", {
              fromValue: sectionBot.tags.formOpacity,
              toValue: unhoveredFormOpacity,
              duration,
              easing,
            })
          );
      }

      this.#visualStateRegistry.registerStateProperty({
        piece: sectionPiece,
        property: "desiredPositionZ",
        value: nextPositionZ,
      });
      if (isInstantaneous) {
        this.#setStrictTag(
          sectionBot,
          (dimension + "Z") as keyof typeof sectionBot.tags,
          nextPositionZ
        );
      } else {
        computedAnimations.push(
          this.#animateStrictTag(
            sectionBot,
            (dimension + "Z") as keyof typeof sectionBot.tags,
            { toValue: nextPositionZ, duration, easing }
          )
        );
      }
      nextPositionZ += sectionDesiredScaleZ;
    }

    return {
      computedAnimations,
      deltaPositionZ: nextPositionZ - desiredPositionZ,
    };
  }

  /**
   * Pure bounding-box math for the section shadow: turns the per-book layout
   * results into the shadow's desired x/y/z scales and its desired Z position.
   */
  #calculateSectionShadowBounds(
    data: StackSectionData,
    activeBooksInsideSection: StackBookData[],
    {
      sectionPiece,
      desiredPositionZ,
      maxBookExtentX,
      maxBookExtentY,
      selectedBooksTotalHeight,
      selectedBooksTotalMargin,
    }: SectionShadowBoundsInput
  ): SectionShadowBounds {
    const explodedShadowPadding = this.#stackConfigProvider.getStackSpacing(
      "ExplodedViewSectionShadowPadding"
    );
    const sectionShadowPadding = this.#stackConfigProvider.getStackSpacing(
      "SectionShadowPadding"
    );
    const emptySectionShadowScaleZ =
      this.#stackConfigProvider.getStackPieceMeasurement(
        "EmptySectionShadowScaleZ"
      );

    const sectionShadowDesiredPositionZ =
      desiredPositionZ +
      (!data.isOnTheGround &&
      data.isInExplodedView &&
      activeBooksInsideSection.length > 0
        ? explodedShadowPadding
        : 0);

    const x = maxBookExtentX * 2 + sectionShadowPadding;
    const y = maxBookExtentY * 2 + sectionShadowPadding;

    let z: number = emptySectionShadowScaleZ;
    if (activeBooksInsideSection.length > 0) {
      if (data.isInExplodedView) {
        z =
          this.#visualStateRegistry.getStateProperty({
            piece: sectionPiece,
            property: "desiredExplodedViewScaleZ",
          }) +
          explodedShadowPadding * 2 +
          selectedBooksTotalHeight +
          selectedBooksTotalMargin;
      } else {
        const booksTotalScaleZ = data.childrenData
          .filter((bookDataArr) =>
            bookDataArr.some((bookData) => bookData.isActive)
          )
          .reduce((total, bookDataArr) => {
            const activeBookPiece = bookDataArr.find(
              (bookData) => bookData.isActive
            )?.piece;
            return (
              total +
              (activeBookPiece
                ? this.#visualStateRegistry.getStateProperty({
                    piece: activeBookPiece,
                    property: "desiredScaleZ",
                  })
                : 0)
            );
          }, 0);
        const tempSectionShadowScaleZ =
          booksTotalScaleZ +
          (activeBooksInsideSection.length + 1) *
            this.#stackConfigProvider.getStackSpacing("BetweenBooks");
        z =
          tempSectionShadowScaleZ > emptySectionShadowScaleZ
            ? tempSectionShadowScaleZ
            : emptySectionShadowScaleZ;
      }
    }

    return { x, y, z, sectionShadowDesiredPositionZ };
  }

  /**
   * Applies the computed bounds to the (already attached) section shadow bot:
   * registers its desired visual state, refreshes its identity tags, and
   * animates / snaps its scale, position and opacity.
   */
  #renderSectionShadow(
    data: StackSectionData,
    context: SectionUpdateContext,
    bounds: SectionShadowBounds,
    {
      computedAnimations,
      activeBooksCount,
    }: { computedAnimations: Array<Promise<void>>; activeBooksCount: number }
  ): void {
    const {
      sectionPiece,
      sectionBot,
      sectionPosition,
      dimension,
      duration,
      easing,
      isInstantaneous,
    } = context;

    const shadow = data.shadow;
    if (!shadow) {
      this.#loggerPort.error(
        "SectionStackUpdaterAdapter: section shadow not attached at updateSplitSection"
      );
      return;
    }

    const shadowBot = this.#sectionShadowMapper.toInfrastructure(shadow);
    if (!shadowBot) {
      this.#loggerPort.error(
        "SectionStackUpdaterAdapter: section shadow bot not found at updateSplitSection"
      );
      return;
    }

    this.#visualStateRegistry.registerState({
      piece: shadow,
      state: {
        desiredPositionZ: bounds.sectionShadowDesiredPositionZ,
        desiredScaleZ: bounds.z,
      },
    });

    const isExplodedWithBooks = data.isInExplodedView && activeBooksCount > 0;
    const initialScaleX = this.#visualStateRegistry.getStateProperty({
      piece: sectionPiece,
      property: "initialScaleX",
    });
    const initialScaleY = this.#visualStateRegistry.getStateProperty({
      piece: sectionPiece,
      property: "initialScaleY",
    });
    const targetScaleX = isExplodedWithBooks ? bounds.x : initialScaleX;
    const targetScaleY = isExplodedWithBooks ? bounds.y : initialScaleY;
    const formOpacity = this.#stackConfigProvider.getStackOpacity(
      "SectionShadowFormOpacity"
    );

    // Identity tags are idempotent; re-applying keeps the highlight colour fresh.
    this.#applyStrictMod(shadowBot, {
      transformer: sectionBot.tags.transformer,
      color: data.highlightColor ?? data.pieceInfo.color,
      sectionName: data.pieceInfo.name,
      sectionDataId: data.id,
    });
    this.#setStrictTag(
      shadowBot,
      dimension as keyof typeof shadowBot.tags,
      true
    );
    this.#setStrictTag(
      shadowBot,
      (dimension + "X") as keyof typeof shadowBot.tags,
      sectionPosition.x
    );
    this.#setStrictTag(
      shadowBot,
      (dimension + "Y") as keyof typeof shadowBot.tags,
      sectionPosition.y
    );

    if (isInstantaneous) {
      this.#setStrictTag(
        shadowBot,
        (dimension + "Z") as keyof typeof shadowBot.tags,
        bounds.sectionShadowDesiredPositionZ
      );
      this.#setStrictTag(shadowBot, "scaleX", targetScaleX);
      this.#setStrictTag(shadowBot, "scaleY", targetScaleY);
      this.#setStrictTag(shadowBot, "scaleZ", bounds.z);
      this.#setStrictTag(shadowBot, "formOpacity", formOpacity);
    } else {
      const shadowScales = this.#getBotScales(shadowBot);
      computedAnimations.push(
        this.#animateStrictTag(shadowBot, "scaleX", {
          fromValue: shadowScales.x,
          toValue: targetScaleX,
          duration,
          easing,
        }),
        this.#animateStrictTag(shadowBot, "scaleY", {
          fromValue: shadowScales.y,
          toValue: targetScaleY,
          duration,
          easing,
        }),
        this.#animateStrictTag(shadowBot, "scaleZ", {
          fromValue: shadowScales.z,
          toValue: bounds.z,
          duration,
          easing,
        }),
        this.#animateStrictTag(shadowBot, "formOpacity", {
          fromValue: shadowBot.tags.formOpacity,
          toValue: formOpacity,
          duration,
          easing,
        }),
        this.#animateStrictTag(
          shadowBot,
          (dimension + "Z") as keyof typeof shadowBot.tags,
          {
            fromValue: getBotPosition(shadowBot, dimension).z,
            toValue: bounds.sectionShadowDesiredPositionZ,
            duration,
            easing,
          }
        )
      );
    }

    this.#setStrictTag(shadowBot, "pointable", activeBooksCount === 0);
  }
}
