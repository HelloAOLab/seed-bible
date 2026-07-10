import {
  AnimateStrictTag,
  GetBotScales,
  SetStrictTag,
} from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/casualos";
import type { SectionSelectionConfigProvider } from "../../config/sectionSelection/SectionSelectionConfigProvider";
import type { SectionSelectionAdapterPort } from "bibleStack.application.ports.out.SectionSelection";
import type { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackSectionShadowMapper } from "../../mappers/StackSectionShadowMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type {
  SectionBot,
  SectionTags,
} from "@packages/Bible Stack/bibleStack/models/stack";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { StackConfigProvider } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/config/stacks/StackConfigProvider";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { BookSetupAdapter } from "./BookSetupAdapter";
import type { BookStackLayoutAdapter } from "./BookStackLayoutAdapter";

interface AdapterParams {
  getDimension(): string;
  selectionConfigProvider: SectionSelectionConfigProvider;
  shadowMapper: StackSectionShadowMapper;
  sectionMapper: StackSectionMapper;
  visualStateRegistry: VisualStateRegistry;
  stackConfigProvider: StackConfigProvider;
  bookSetupAdapter: BookSetupAdapter;
  bookMapper: StackBookMapper;
  bookStackLayoutAdapter: BookStackLayoutAdapter;
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
  }

  /**
   * The inverse of `deselect`: the section "explodes" — a quick rotation
   * wiggle, then it rises to its exploded Z and expands its depth while
   * fading out, handing the surface over to the books that take its place.
   */
  async select(data: StackSectionData): Promise<void> {
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
    const duration = this.#selectionConfigProvider.getDuration();
    const easing = this.#selectionConfigProvider.getEasing();

    const sectionPosition = getBotPosition(sectionBot, dimension);
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
          })
        ),
      Promise.resolve()
    );

    // const focusOnRotation = { x: 1.01229, y: 0.5 };
    // const sectionPosition = getBotPosition(section, dimension);
    // let fixedPosition = new Vector3(
    //   sectionPosition.x,
    //   sectionPosition.y,
    //   sectionNewPositionZ + section.tags.desiredExplodedViewScaleZ / 2
    // );
    // if (sectionData.getParentId("stackBibleId")) {
    //   const transformerPosition = getBotPosition(
    //     section.links.transformerLink,
    //     dimension
    //   );
    //   fixedPosition = fixedPosition.add(transformerPosition);
    // }
    // const desiredFocusOnPosition = GetCamRotationFocusPoint({
    //   theta: focusOnRotation.y,
    //   phi: focusOnRotation.x,
    //   botPosition: fixedPosition,
    // });

    await Promise.all([
      wiggle,
      AnimateStrictTag(sectionBot, zTag, {
        fromValue: sectionPosition.z,
        toValue: sectionNewPositionZ,
        duration,
        easing,
      }),
      AnimateStrictTag(sectionBot, "scaleZ", {
        fromValue: GetBotScales(sectionBot).z,
        toValue: desiredExplodedViewScaleZ,
        duration,
        easing,
      }),
      // os.focusOn(
      //     { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
      //     {
      //         duration: cameraFocusDuration,
      //         easing: { type: "sinusoidal", mode: "inout" },
      //         rotation: focusOnRotation,
      //         zoom: 8,
      //     }
      // ),
    ]);

    await AnimateStrictTag(sectionBot, "formOpacity", {
      fromValue: sectionBot.tags.formOpacity,
      toValue: 0,
      duration,
      easing: sineOut,
    });

    SetStrictTag(sectionBot, "color", "clear");
    SetStrictTag(sectionBot, "pointable", false);

    await this.#cascadeBooks(data, sectionBot);
  }

  /**
   * Books appear in a staggered cascade: each active book is set up at its
   * collapsed initial position, then animated out to its desired exploded
   * position one after another.
   */
  async #cascadeBooks(
    data: StackSectionData,
    sectionBot: SectionBot
  ): Promise<void> {
    const dimension = this.#getDimension();
    const duration = this.#selectionConfigProvider.getDuration();
    const easing = this.#selectionConfigProvider.getEasing();
    const staggerMs = this.#selectionConfigProvider.getBookEntranceStaggerMs();

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
    const explodedViewCustomScale = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "explodedViewCustomScale",
    });
    const initialScaleX = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "initialScaleX",
    });
    const initialScaleY = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "initialScaleY",
    });
    const initialScaleZ = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "initialScaleZ",
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
    const targetScaleX = explodedViewCustomScale
      ? explodedViewCustomScale.x * sectionInitialScaleX
      : initialScaleX;
    const targetScaleY = explodedViewCustomScale
      ? explodedViewCustomScale.y * sectionInitialScaleY
      : initialScaleY;

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
        scaleZ: initialScaleZ,
        formOpacity: unhoveredFormOpacity,
      },
      duration,
      easing,
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
    SetStrictTag(
      sectionBot,
      "color",
      // BibleVizUtils.Data.masks.isInHistoryMode
      //     ? BibleVizUtils.Functions.GetHistoryColor({ piece: data.piece })
      //     : (data.highlightColor ?? data.pieceInfo.color)
      data.highlightColor ?? data.pieceInfo.color
    );
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
    });
  }
}
