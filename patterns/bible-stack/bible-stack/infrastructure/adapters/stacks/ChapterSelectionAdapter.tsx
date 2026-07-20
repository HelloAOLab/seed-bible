import type {
  ChapterSelectionAdapterPort,
  ChapterSelectionParams,
} from "../../../application/ports/out/ChapterSelection";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackChapterMapper } from "../../mappers/StackChapterMapper";
import type { ChapterSelectionConfigProvider } from "../../config/chapterSelection/ChapterSelectionConfigProvider";
import type { ColorLerper } from "../environment/ColorLerper";
import type { LabelDataStore } from "../labels/LabelDataStore";
import type { LabelFeedbackAdapter } from "../labels/LabelFeedbackAdapter";
import {
  AnimateStrictTag,
  GetBotScales,
  SetStrictTag,
} from "../../functions/casualos";
import { HexToRgb } from "../../../domain/functions/colors";
import type { Piece } from "../../../domain/models/canvas";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { VersesBundleMapper } from "../../mappers/VersesBundleMapper";
import type { VersesBundleTags, ChapterBot } from "../../models/stack";
import type { VersesBundleAdapter } from "./VersesBundleAdapter";
import type { LayoutConfigProvider } from "../../config/layout/LayoutConfigProvider";
import type { PiecesConfigProvider } from "../../config/pieces.tsx/PiecesConfigProvider";
import type { VersesBundleVisualState } from "../../models/visualState";

interface AdapterParams {
  getDimension(): string;
  configProvider: ChapterSelectionConfigProvider;
  mapper: StackChapterMapper;
  colorLerper: ColorLerper;
  labelDataStore: LabelDataStore;
  labelFeedbackAdapter: LabelFeedbackAdapter;
  getBookName: (bookId: string) => string | undefined;
  visualStateRegistry: VisualStateRegistry;
  versesBundleMapper: VersesBundleMapper;
  versesBundleAdapter: VersesBundleAdapter;
  stackConfigProvider: LayoutConfigProvider;
  piecesConfigProvider: PiecesConfigProvider;
}

/** Shared render context resolved by `select` and handed to each branch. */
interface ChapterSelectContext {
  data: StackChapterData;
  chapter: Piece<"StackChapter">;
  chapterBot: ChapterBot;
  chapterPosition: { x: number; y: number; z: number };
  dimension: string;
  duration: number;
  easing: ReturnType<ChapterSelectionConfigProvider["getSelectionEasing"]>;
}

export class ChapterSelectionAdapter implements ChapterSelectionAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #configProvider: AdapterParams["configProvider"];
  #mapper: AdapterParams["mapper"];
  #colorLerper: AdapterParams["colorLerper"];
  #labelDataStore: AdapterParams["labelDataStore"];
  #labelFeedbackAdapter: AdapterParams["labelFeedbackAdapter"];
  #getBookName: AdapterParams["getBookName"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #versesBundleMapper: AdapterParams["versesBundleMapper"];
  #versesBundleAdapter: AdapterParams["versesBundleAdapter"];
  #stackConfigProvider: AdapterParams["stackConfigProvider"];
  #piecesConfigProvider: AdapterParams["piecesConfigProvider"];

  constructor({
    getDimension,
    configProvider,
    mapper,
    colorLerper,
    labelDataStore,
    labelFeedbackAdapter,
    getBookName,
    visualStateRegistry,
    versesBundleMapper,
    versesBundleAdapter,
    stackConfigProvider,
    piecesConfigProvider,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#configProvider = configProvider;
    this.#mapper = mapper;
    this.#colorLerper = colorLerper;
    this.#labelDataStore = labelDataStore;
    this.#labelFeedbackAdapter = labelFeedbackAdapter;
    this.#getBookName = getBookName;
    this.#visualStateRegistry = visualStateRegistry;
    this.#versesBundleMapper = versesBundleMapper;
    this.#versesBundleAdapter = versesBundleAdapter;
    this.#stackConfigProvider = stackConfigProvider;
    this.#piecesConfigProvider = piecesConfigProvider;
  }

  async select({ data }: ChapterSelectionParams) {
    const dimension = this.#getDimension();
    const duration = this.#configProvider.getSelectionDuration();
    const easing = this.#configProvider.getSelectionEasing();

    const chapter = data.piece;
    if (!chapter) {
      console.error(
        "ChapterSelectionAdapter: data.piece not defined at select."
      );
      return;
    }
    const chapterBot = this.#mapper.toInfrastructure(chapter);

    if (!chapterBot) {
      console.error(
        "ChapterSelectionAdapter: chapterBot not defined at select."
      );
      return;
    }

    const chapterPosition = getBotPosition(chapterBot, dimension);

    this.#tryStopTransition(data);

    const context: ChapterSelectContext = {
      data,
      chapter,
      chapterBot,
      chapterPosition,
      dimension,
      duration,
      easing,
    };

    if (data.isOnTheGround) {
      await this.#selectGroundedChapter(context);
    } else {
      await this.#selectStackedChapter(context);
    }
  }

  /** A grounded chapter expands into a grid and reveals its verse bundles. */
  async #selectGroundedChapter({
    data,
    chapter,
    chapterBot,
    chapterPosition,
    dimension,
    duration,
    easing,
  }: ChapterSelectContext) {
    const bundleShowBaseDelay = this.#configProvider.getBundleShowBaseDelay();
    const bundleShowDuration = this.#configProvider.getBundleShowDuration();
    const bookId = data.getCreationParam("bookId");
    const bookName = this.#getBookName(bookId) ?? bookId;

    const chapterScales = GetBotScales(thisBot);
    const labelText = `${bookName} ${data.getPieceInfoProperty("number")}`;
    const chapterMargin = this.#configProvider.getGroundedMargin();
    const targetColor = HexToRgb({
      // hexColor: BibleVizUtils.Data.masks.isInHistoryMode
      //   ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
      //   : (data.paintColor ?? thisBot.tags.initialColor),
      hexColor:
        data.paintColor ??
        this.#visualStateRegistry.getStateProperty({
          piece: chapter,
          property: "initialColor",
        }),
    });

    try {
      const expandedScales = this.#configProvider.getExpandedScales();
      const expandSequence = [
        this.#colorLerper.lerp({
          end: targetColor,
          durationSec: duration,
          bot: chapterBot,
          tag: "color",
        }),
        AnimateStrictTag(chapterBot, "labelOpacity", {
          toValue: 0,
          duration: duration / 2,
          easing,
        }).then(() => {
          SetStrictTag(chapterBot, "labelPosition", "top");
          SetStrictTag(chapterBot, "label", labelText);
          return AnimateStrictTag(chapterBot, "labelOpacity", {
            toValue: 1,
            duration: duration / 2,
            easing,
          });
        }),
        AnimateStrictTag(chapterBot, {
          fromValue: {
            scaleX: chapterScales.x,
            scaleY: chapterScales.y,
            scaleZ: chapterScales.z,
          },
          toValue: {
            scaleX: expandedScales.x,
            scaleY: expandedScales.y,
            scaleZ: expandedScales.z,
          },
          duration,
          easing,
        }),
      ];
      await Promise.all(expandSequence);

      for (let i = 0; i < data.childrenData.length; i++) {
        const bundle = data.childrenData[i]!;
        if (!bundle.piece) {
          throw new Error(
            `ChapterSelectionAdapter: bundle.piece not defined at select`
          );
        }
        const bundleBot = this.#versesBundleMapper.toInfrastructure(
          bundle.piece
        );
        if (!bundleBot) {
          throw new Error(
            `ChapterSelectionAdapter: bundleBot not found at select`
          );
        }
        const positionY =
          chapterPosition.y -
          expandedScales.y / 2 -
          bundleBot.tags.scaleY / 2 -
          chapterMargin -
          i * (chapterMargin + bundleBot.tags.scaleY);
        const verseStart = bundle.getCreationParam("start");
        const verseEnd = verseStart - 1 + bundle.getCreationParam("count");
        const label = `${verseStart}${verseStart !== verseEnd ? ` - ${verseEnd}` : ""}`;
        SetStrictTag(
          bundleBot,
          (dimension + "X") as keyof VersesBundleTags,
          chapterPosition.x
        );
        SetStrictTag(
          bundleBot,
          (dimension + "Y") as keyof VersesBundleTags,
          positionY
        );
        SetStrictTag(
          bundleBot,
          (dimension + "Z") as keyof VersesBundleTags,
          chapterPosition.z
        );
        SetStrictTag(bundleBot, "label", label);
        this.#visualStateRegistry.registerState({
          piece: bundle.piece,
          state: this.#piecesConfigProvider.getInitialVisualState(
            bundle.piece.type
          ) as VersesBundleVisualState,
        });
      }

      await Promise.all(
        data.childrenData.map((bundle, index) => {
          return this.#versesBundleAdapter.show({
            piece: bundle.piece!,
            dimension,
            delay: index * bundleShowBaseDelay,
            duration: bundleShowDuration,
          });
        })
      );
    } catch (error) {
      console.error(error);
    }
  }

  /** A stacked (non-grounded) chapter just expands its selected face. */
  async #selectStackedChapter({
    data,
    chapter,
    chapterBot,
    chapterPosition,
    dimension,
    duration,
    easing,
  }: ChapterSelectContext) {
    const targetColor = HexToRgb({
      // hexColor: BibleVizUtils.Data.masks.isInHistoryMode
      //   ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
      //   : (chapterData.highlightColor ?? thisBot.tags.selectedColor),
      hexColor:
        data.paintColor ??
        this.#visualStateRegistry.getStateProperty({
          piece: chapter,
          property: "selectedColor",
        }),
    });

    const expandSequence = [
      this.#colorLerper.lerp({
        end: targetColor,
        durationSec: duration,
        bot: chapterBot,
        tag: "color",
      }),
      AnimateStrictTag(chapterBot, {
        fromValue: {
          scaleY: this.#visualStateRegistry.getStateProperty({
            piece: chapter,
            property: "initialScaleY",
          }),
          [dimension + "Y"]: chapterPosition.y,
        },
        toValue: {
          scaleY: this.#visualStateRegistry.getStateProperty({
            piece: chapter,
            property: "selectedScaleY",
          }),
          [dimension + "Y"]:
            chapterPosition.y -
            this.#stackConfigProvider.getStackPieceMeasurement(
              "ChapterFrontSelectedDepth"
            ) /
              2,
        },
        duration,
        easing,
      }),
    ];
    await Promise.all(expandSequence);
  }

  async deselect({ data }: ChapterSelectionParams) {
    const dimension = this.#getDimension();
    const duration = this.#configProvider.getSelectionDuration();
    const easing = this.#configProvider.getSelectionEasing();

    const chapter = data.piece;
    if (!chapter) {
      console.error(
        "ChapterSelectionAdapter: data.piece not defined at deselect."
      );
      return;
    }
    const chapterBot = this.#mapper.toInfrastructure(chapter);
    if (!chapterBot) {
      console.error(
        "ChapterSelectionAdapter: chapterBot not defined at deselect."
      );
      return;
    }

    const chapterPosition = getBotPosition(chapterBot, dimension);

    this.#tryStopTransition(data);

    const context: ChapterSelectContext = {
      data,
      chapter,
      chapterBot,
      chapterPosition,
      dimension,
      duration,
      easing,
    };

    if (data.isOnTheGround) {
      await this.#deselectGroundedChapter(context);
    } else {
      await this.#deselectStackedChapter(context);
    }
  }

  /** A grounded chapter hides its verse bundles and collapses back to the grid. */
  async #deselectGroundedChapter({
    data,
    chapter,
    chapterBot,
    dimension,
    duration,
    easing,
  }: ChapterSelectContext) {
    const bundleHideBaseDelay = this.#configProvider.getBundleShowBaseDelay();
    const bundleHideDuration = this.#configProvider.getBundleShowDuration();
    const chapterScales = GetBotScales(chapterBot);
    const targetColor = HexToRgb({
      hexColor:
        data.paintColor ??
        this.#visualStateRegistry.getStateProperty({
          piece: chapter,
          property: "initialColor",
        }),
    });

    const reversedBundles = data.getReversedChildren();
    await Promise.all(
      reversedBundles.map((bundle, index) =>
        this.#versesBundleAdapter.hide({
          data: bundle,
          dimension,
          delay: bundleHideBaseDelay + index,
          duration: bundleHideDuration,
        })
      )
    );

    const shrinkAnimations: Promise<void>[] = [
      this.#colorLerper.lerp({
        end: targetColor,
        durationSec: duration,
        bot: chapterBot,
        tag: "color",
      }),
      AnimateStrictTag(chapterBot, "labelOpacity", {
        toValue: 0,
        duration: duration / 2,
        easing,
      }).then(() => {
        SetStrictTag(chapterBot, "labelPosition", "front");
        SetStrictTag(
          chapterBot,
          "label",
          String(data.getPieceInfoProperty("number"))
        );
        return AnimateStrictTag(chapterBot, "labelOpacity", {
          toValue: 1,
          duration: duration / 2,
          easing,
        });
      }),
      AnimateStrictTag(chapterBot, {
        fromValue: {
          scaleX: chapterScales.x,
          scaleY: chapterScales.y,
          scaleZ: chapterScales.z,
        },
        toValue: {
          scaleX: this.#visualStateRegistry.getStateProperty({
            piece: chapter,
            property: "initialScaleX",
          }),
          scaleY: this.#visualStateRegistry.getStateProperty({
            piece: chapter,
            property: "initialScaleY",
          }),
          scaleZ: this.#visualStateRegistry.getStateProperty({
            piece: chapter,
            property: "initialScaleZ",
          }),
        },
        duration,
        easing,
      }),
    ];
    await Promise.all(shrinkAnimations);
  }

  /** A stacked (non-grounded) chapter collapses its selected face back to idle. */
  async #deselectStackedChapter({
    data,
    chapter,
    chapterBot,
    chapterPosition,
    dimension,
    duration,
    easing,
  }: ChapterSelectContext) {
    const targetColor = HexToRgb({
      hexColor:
        data.paintColor ??
        this.#visualStateRegistry.getStateProperty({
          piece: chapter,
          property: "initialColor",
        }),
    });

    const shrinkAnimations: Promise<void>[] = [
      this.#colorLerper.lerp({
        end: targetColor,
        durationSec: duration,
        bot: chapterBot,
        tag: "color",
      }),
      AnimateStrictTag(chapterBot, {
        fromValue: {
          scaleY: this.#visualStateRegistry.getStateProperty({
            piece: chapter,
            property: "selectedScaleY",
          }),
          [dimension + "Y"]: chapterPosition.y,
        },
        toValue: {
          scaleY: this.#visualStateRegistry.getStateProperty({
            piece: chapter,
            property: "initialScaleY",
          }),
          [dimension + "Y"]:
            chapterPosition.y +
            this.#stackConfigProvider.getStackPieceMeasurement(
              "ChapterFrontSelectedDepth"
            ) /
              2,
        },
        duration,
        easing,
      }),
    ];
    await Promise.all(shrinkAnimations);
  }

  #tryStopTransition(data: StackChapterData) {
    if (!data.piece) {
      console.error(
        "ChapterSelectionAdapter: data.piece not defined at tryStopTransition."
      );
      return;
    }
    const chapterBot = this.#mapper.toInfrastructure(data.piece);

    if (!chapterBot) {
      console.error(
        "ChapterSelectionAdapter: chapterBot not found at tryStopTransition."
      );
      return;
    }

    if (
      data.selectionState !== "Selecting" &&
      data.selectionState !== "Deselecting"
    ) {
      clearAnimations(chapterBot, "scaleX");
      clearAnimations(chapterBot, "scaleY");
      clearAnimations(chapterBot, "scaleZ");
      this.#colorLerper.stop(chapterBot, "color");
    }

    const labelData = this.#labelDataStore.getDataByOwnerId(data.piece.id);
    if (labelData) {
      this.#labelFeedbackAdapter.stopOpacityTransition(labelData);
    }
  }
}
