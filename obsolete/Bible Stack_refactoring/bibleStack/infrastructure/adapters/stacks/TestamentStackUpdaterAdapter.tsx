import type {
  TestamentStackUpdaterPort,
  UpdateCommand,
} from "@packages/Bible Stack/bibleStack/application/ports/out/StackTestamentUpdater";
import type { StackUpdateConfigProvider } from "../../config/stackUpdate/StackUpdateConfigProvider";
import type { LoggerPort } from "@packages/Bible Stack/bibleStack/application/ports/in/Logger";
import type { StackTestamentMapper } from "../../mappers/StackTestamentMapper";
import type { StackSectionBookMapper } from "../../mappers/StackSectionBookMapper";
import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { Easing } from "../../../../../../typings/AuxLibraryDefinitions";
import type { StackConfigProvider } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/config/stacks/StackConfigProvider";
import type { SectionStackUpdaterAdapter } from "./SectionStackUpdaterAdapter";
import type { BookStackUpdaterAdapter } from "./BookStackUpdaterAdapter";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type {
  SetStrictTag,
  AnimateStrictTag,
} from "bibleVizUtils.infrastructure.functions.casualos";

interface AdapterParams {
  getDimension: () => string;
  stackUpdateConfigProvider: StackUpdateConfigProvider;
  testamentMapper: StackTestamentMapper;
  sectionBookMapper: StackSectionBookMapper;
  stackConfigProvider: StackConfigProvider;
  sectionStackUpdaterAdapter: SectionStackUpdaterAdapter;
  bookStackUpdaterAdapter: BookStackUpdaterAdapter;
  visualStateRegistry: VisualStateRegistry;
  setStrictTag: typeof SetStrictTag;
  animateStrictTag: typeof AnimateStrictTag;
  loggerPort: LoggerPort;
}

interface TestamentUpdateContext {
  pacing: StackUpdatePacing;
  dimension: string;
  duration: number;
  easing: Easing;
  desiredPositionZ: number;
}

type ComputeResult = {
  computedAnimations: Array<Promise<void>>;
  deltaPositionZ: number;
};

export class TestamentStackUpdaterAdapter implements TestamentStackUpdaterPort {
  #getDimension: AdapterParams["getDimension"];
  #stackUpdateConfigProvider: AdapterParams["stackUpdateConfigProvider"];
  #testamentMapper: AdapterParams["testamentMapper"];
  #sectionBookMapper: AdapterParams["sectionBookMapper"];
  #stackConfigProvider: AdapterParams["stackConfigProvider"];
  #sectionStackUpdaterAdapter: AdapterParams["sectionStackUpdaterAdapter"];
  #bookStackUpdaterAdapter: AdapterParams["bookStackUpdaterAdapter"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #setStrictTag: AdapterParams["setStrictTag"];
  #animateStrictTag: AdapterParams["animateStrictTag"];
  #loggerPort: AdapterParams["loggerPort"];

  constructor({
    getDimension,
    stackUpdateConfigProvider,
    testamentMapper,
    sectionBookMapper,
    stackConfigProvider,
    sectionStackUpdaterAdapter,
    bookStackUpdaterAdapter,
    visualStateRegistry,
    setStrictTag,
    animateStrictTag,
    loggerPort,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#stackUpdateConfigProvider = stackUpdateConfigProvider;
    this.#testamentMapper = testamentMapper;
    this.#sectionBookMapper = sectionBookMapper;
    this.#stackConfigProvider = stackConfigProvider;
    this.#sectionStackUpdaterAdapter = sectionStackUpdaterAdapter;
    this.#bookStackUpdaterAdapter = bookStackUpdaterAdapter;
    this.#visualStateRegistry = visualStateRegistry;
    this.#setStrictTag = setStrictTag;
    this.#animateStrictTag = animateStrictTag;
    this.#loggerPort = loggerPort;
  }

  async update({ data, pacing }: UpdateCommand): Promise<void> {
    const dimension = this.#getDimension();
    const duration = this.#stackUpdateConfigProvider.getDuration(pacing);
    const easing = this.#stackUpdateConfigProvider.getEasing();
    const testament = data.piece;

    if (!testament) {
      this.#loggerPort.error(
        "TestamentStackUpdaterAdapter: testament not defined"
      );
      return;
    }

    const testamentBot = this.#testamentMapper.toInfrastructure(testament);
    if (!testamentBot) {
      this.#loggerPort.error(
        "TestamentStackUpdaterAdapter: testamentBot not found"
      );
      return;
    }

    const testamentPosition = getBotPosition(testamentBot, dimension);

    const { computedAnimations } = this.computeVisualUpdate({
      pacing,
      data,
      desiredPositionZ: testamentPosition.z,
      dimension,
      duration,
      easing,
    });

    await Promise.allSettled(computedAnimations);
  }

  /**
   * Switchboard: route to the split-into-sections renderer or the whole-testament
   * renderer based on the testament's split state.
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
    data: StackTestamentData;
    desiredPositionZ: number;
    dimension: string;
    duration: number;
    easing: Easing;
  }): ComputeResult {
    const context: TestamentUpdateContext = {
      pacing,
      dimension,
      duration,
      easing,
      desiredPositionZ,
    };

    if (data.isSplitIntoSections) {
      return this.#updateSplitTestament(data, context);
    }

    return this.#updateSolidTestament(data, context);
  }

  /**
   * Split testament: lay out each active child in Z. True sections delegate to
   * the section adapter; single-book sections delegate to the book adapter.
   */
  #updateSplitTestament(
    data: StackTestamentData,
    {
      pacing,
      dimension,
      duration,
      easing,
      desiredPositionZ,
    }: TestamentUpdateContext
  ): ComputeResult {
    const computedAnimations: Array<Promise<void>> = [];
    const spaceBetweenSections =
      this.#stackConfigProvider.getStackSpacing("BetweenSections");

    let nextPositionZ = desiredPositionZ + spaceBetweenSections;

    for (const sectionData of data.getActiveSections()) {
      const { computedAnimations: childAnimations, deltaPositionZ } =
        sectionData.type === "StackSection"
          ? this.#sectionStackUpdaterAdapter.computeVisualUpdate({
              pacing,
              data: sectionData,
              desiredPositionZ: nextPositionZ,
              dimension,
              duration,
              easing,
            })
          : this.#updateSectionBook(sectionData, {
              pacing,
              dimension,
              duration,
              easing,
              desiredPositionZ: nextPositionZ,
            });

      computedAnimations.push(...childAnimations);
      nextPositionZ += deltaPositionZ + spaceBetweenSections;
    }

    return {
      computedAnimations,
      deltaPositionZ: nextPositionZ - desiredPositionZ,
    };
  }

  /**
   * A single-book section: delegate the layout to the book render adapter, then
   * advance by the book's desired Z scale. The book adapter computes its own
   * selected-book grid layout (via the injected SelectedBookLayoutAdapter), so
   * nothing layout-related needs to be threaded through here.
   */
  #updateSectionBook(
    data: StackSectionBookData,
    {
      pacing,
      dimension,
      duration,
      easing,
      desiredPositionZ,
    }: TestamentUpdateContext
  ): ComputeResult {
    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error(
        "TestamentStackUpdaterAdapter: section-book piece not defined"
      );
      return { computedAnimations: [], deltaPositionZ: 0 };
    }
    const bot = this.#sectionBookMapper.toInfrastructure(piece);
    if (!bot) {
      this.#loggerPort.error(
        "TestamentStackUpdaterAdapter: section-book bot not found"
      );
      return { computedAnimations: [], deltaPositionZ: 0 };
    }

    const position = getBotPosition(bot, dimension);
    const { computedAnimations } =
      this.#bookStackUpdaterAdapter.computeVisualUpdate({
        data,
        pacing,
        dimension,
        duration,
        easing,
        desiredPositionX: position.x,
        desiredPositionY: position.y,
        desiredPositionZ,
      });

    const deltaPositionZ = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "desiredScaleZ",
    });

    return { computedAnimations, deltaPositionZ };
  }

  /** Whole (unsplit) testament: position the testament piece itself along Z. */
  #updateSolidTestament(
    data: StackTestamentData,
    {
      pacing,
      dimension,
      duration,
      easing,
      desiredPositionZ,
    }: TestamentUpdateContext
  ): ComputeResult {
    const computedAnimations: Array<Promise<void>> = [];
    let nextPositionZ = desiredPositionZ;

    if (data.isActive) {
      const piece = data.piece;
      if (!piece) {
        this.#loggerPort.error(
          "TestamentStackUpdaterAdapter: testament piece not defined at updateSolidTestament"
        );
        return { computedAnimations, deltaPositionZ: 0 };
      }
      const bot = this.#testamentMapper.toInfrastructure(piece);
      if (!bot) {
        this.#loggerPort.error(
          "TestamentStackUpdaterAdapter: testamentBot not found at updateSolidTestament"
        );
        return { computedAnimations, deltaPositionZ: 0 };
      }

      const isInstantaneous = pacing === "Instant";
      this.#visualStateRegistry.registerStateProperty({
        piece,
        property: "desiredPositionZ",
        value: nextPositionZ,
      });
      if (isInstantaneous) {
        this.#setStrictTag(
          bot,
          (dimension + "Z") as keyof typeof bot.tags,
          nextPositionZ
        );
      } else {
        computedAnimations.push(
          this.#animateStrictTag(
            bot,
            (dimension + "Z") as keyof typeof bot.tags,
            { toValue: nextPositionZ, duration, easing }
          )
        );
      }
      nextPositionZ += this.#visualStateRegistry.getStateProperty({
        piece,
        property: "desiredScaleZ",
      });
    }

    return {
      computedAnimations,
      deltaPositionZ: nextPositionZ - desiredPositionZ,
    };
  }
}
