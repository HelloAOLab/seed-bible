import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ExplodedViewService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ExplodedVIewService";
import type { PieceActivityServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceActivity";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type { ExplodedViewEventPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/ExplodedView";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import type { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import {
  BibleVisualizationStates,
  type BibleVisualizationState,
  type ParentDataIds,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { SectionInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";

describe("pattern.bible-stack.application.services.ExplodedVIewService", () => {
  let service: ExplodedViewService;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let pieceActivityServicePort: Mocked<PieceActivityServicePort>;
  let bibleStackEventPort: Mocked<ExplodedViewEventPort>;
  let loggerPort: Mocked<LoggerPort>;
  let executionOrder: string[];

  const makeSectionInfo = (name: string): SectionInfo => ({
    name,
    color: "#ffffff",
    books: [],
    path: {
      arrangementName: "arrangement",
      testamentIndex: 0,
      sectionIndex: 0,
    },
  });

  const makeSection = ({
    id = "section-id",
    parentDataIds = {},
    isInExplodedView = false,
  }: {
    id?: string;
    parentDataIds?: ParentDataIds;
    isInExplodedView?: boolean;
  } = {}): StackSectionData =>
    new StackSectionData({
      id,
      parentDataIds,
      isInExplodedView,
      pieceInfo: makeSectionInfo(id),
      creationParams: {
        arrangementIndex: 0,
        testamentIndex: 0,
        sectionIndex: 0,
        amountOfChaptersInSection: 1,
      },
    });

  const makeBibleData = (
    currentStackVizState: BibleVisualizationState
  ): StackBibleData =>
    ({ id: "bible-id", currentStackVizState }) as unknown as StackBibleData;

  const makeTestamentData = (): StackTestamentData =>
    ({ id: "testament-id" }) as unknown as StackTestamentData;

  const makeChain = ({
    bibleData,
    testamentData,
  }: {
    bibleData?: StackBibleData;
    testamentData?: StackTestamentData;
  } = {}): ParentDataChain => ({
    bibleData,
    testamentData,
    sectionData: undefined,
    sectionBookData: undefined,
    bookData: undefined,
  });

  const captureDuringStackUpdate = (capture: () => void) => {
    stackUpdateServicePort.updateStack.mockImplementation(async () => {
      executionOrder.push("updateStack");
      capture();
    });
  };

  beforeEach(() => {
    executionOrder = [];

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(() => makeChain()),
    };

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(async () => {
        executionOrder.push("updateStack");
      }),
    };

    pieceActivityServicePort = {
      getPieceActivity: vi.fn(),
      getActivityIndicatorsForPiece: vi.fn(),
      getActivityIndicatorByType: vi.fn(),
      getExtraActivityIndicatorsForPiece: vi.fn(),
      getPieceIndicatorByActivityIndex: vi.fn(),
      getDataActivityIndicatorByType: vi.fn(),
      getDataExtraActivityIndicators: vi.fn(),
      getDataIndicatorByActivityIndex: vi.fn(),
      tryHideIndicators: vi.fn(),
      updateIndicators: vi.fn(),
      updateAllIndicators: vi.fn(),
      tryHideNotification: vi.fn(),
      updateNotification: vi.fn(),
      updateAllNotifications: vi.fn(() => {
        executionOrder.push("updateAllNotifications");
      }),
      updateAllNotificationsDirection: vi.fn(),
    };

    bibleStackEventPort = {
      emit: vi.fn(() => {
        executionOrder.push("emit");
      }),
    } as unknown as Mocked<ExplodedViewEventPort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new ExplodedViewService({
      pieceHierarchyServicePort,
      stackUpdateServicePort,
      pieceActivityServicePort,
      bibleStackEventPort,
      loggerPort,
    });
  });

  describe("explodeSection", () => {
    it("implodes the currently exploded section if exists, and if the section is within a bible and it is regular-visualized, or if it is just within a testament, before the stack update sequence", async () => {
      const scenarios = [
        {
          chain: makeChain({
            bibleData: makeBibleData(BibleVisualizationStates.Regular),
            testamentData: makeTestamentData(),
          }),
          shouldImplode: true,
        },
        {
          chain: makeChain({ testamentData: makeTestamentData() }),
          shouldImplode: true,
        },
        {
          chain: makeChain({
            bibleData: makeBibleData(BibleVisualizationStates.Expanded),
            testamentData: makeTestamentData(),
          }),
          shouldImplode: false,
        },
        {
          chain: makeChain(),
          shouldImplode: false,
        },
      ];

      for (const { chain, shouldImplode } of scenarios) {
        const previousSection = makeSection({
          id: "previous-section",
          isInExplodedView: true,
        });
        service.registerExplodedSection(previousSection);
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(chain);

        let wasExplodedAtStackUpdate: boolean | undefined;
        captureDuringStackUpdate(() => {
          wasExplodedAtStackUpdate = previousSection.isInExplodedView;
        });

        await service.explodeSection({ data: makeSection({ id: "next" }) });

        expect(previousSection.isInExplodedView).toBe(!shouldImplode);
        expect(wasExplodedAtStackUpdate).toBe(!shouldImplode);
      }
    });

    it("explodes the section, before the stack update sequence", async () => {
      const data = makeSection();
      let wasExplodedAtStackUpdate: boolean | undefined;
      captureDuringStackUpdate(() => {
        wasExplodedAtStackUpdate = data.isInExplodedView;
      });

      expect(data.isInExplodedView).toBe(false);

      await service.explodeSection({ data });

      expect(wasExplodedAtStackUpdate).toBe(true);
      expect(data.isInExplodedView).toBe(true);
    });

    it("register the section as the current exploded, before the stack update sequence", async () => {
      const data = makeSection();
      let registeredAtStackUpdate: StackSectionData | undefined;
      captureDuringStackUpdate(() => {
        registeredAtStackUpdate = service.currentExplodedSection;
      });

      await service.explodeSection({ data });

      expect(registeredAtStackUpdate).toBe(data);
      expect(service.currentExplodedSection).toBe(data);
    });

    it("executes the stack update sequence with the correct ancestor, before final emit", async () => {
      const data = makeSection({
        id: "section-id",
        parentDataIds: {
          stackBibleId: "bible-id",
          stackTestamentId: "testament-id",
        },
      });

      await service.explodeSection({
        data,
        pacing: StackUpdatePacings.Fast,
      });

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        "bible-id",
        "StackBible",
        StackUpdatePacings.Fast
      );
      expect(executionOrder.indexOf("updateStack")).toBeLessThan(
        executionOrder.indexOf("emit")
      );

      vi.clearAllMocks();
      executionOrder = [];

      const orphanData = makeSection({ id: "orphan-section-id" });

      await service.explodeSection({ data: orphanData });

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        "orphan-section-id",
        "StackSection",
        StackUpdatePacings.Regular
      );
      expect(executionOrder.indexOf("updateStack")).toBeLessThan(
        executionOrder.indexOf("emit")
      );
    });

    it("updates all notifications, after the stack update sequence, before final emit", async () => {
      await service.explodeSection({ data: makeSection() });

      expect(
        pieceActivityServicePort.updateAllNotifications
      ).toHaveBeenCalledOnce();
      expect(executionOrder).toEqual([
        "updateStack",
        "updateAllNotifications",
        "emit",
      ]);
    });

    it("emits at the end", async () => {
      const data = makeSection();

      await service.explodeSection({ data });

      expect(bibleStackEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnStackSectionExploded",
        { sectionData: data }
      );
      expect(executionOrder.at(-1)).toBe("emit");
    });

    it("does not throw if the stack update sequence rejects", async () => {
      stackUpdateServicePort.updateStack.mockRejectedValue(
        new Error("stack update failed")
      );

      await expect(
        service.explodeSection({ data: makeSection() })
      ).resolves.toBeUndefined();
    });

    it("logs an error and neither updates notifications nor emits if the stack update sequence is rejected", async () => {
      const error = new Error("stack update failed");
      stackUpdateServicePort.updateStack.mockRejectedValue(error);

      await service.explodeSection({ data: makeSection() });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ExplodedViewService: Failed to explode section",
        { error }
      );
      expect(
        pieceActivityServicePort.updateAllNotifications
      ).not.toHaveBeenCalled();
      expect(bibleStackEventPort.emit).not.toHaveBeenCalled();
    });

    it("works with consecutive calls", async () => {
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeChain({ testamentData: makeTestamentData() })
      );
      const firstSection = makeSection({
        id: "first-section",
        parentDataIds: { stackTestamentId: "testament-id" },
      });
      const secondSection = makeSection({
        id: "second-section",
        parentDataIds: { stackTestamentId: "testament-id" },
      });

      await service.explodeSection({ data: firstSection });

      expect(firstSection.isInExplodedView).toBe(true);
      expect(service.currentExplodedSection).toBe(firstSection);

      await service.explodeSection({
        data: secondSection,
        pacing: StackUpdatePacings.Instant,
      });

      expect(firstSection.isInExplodedView).toBe(false);
      expect(secondSection.isInExplodedView).toBe(true);
      expect(service.currentExplodedSection).toBe(secondSection);
      expect(stackUpdateServicePort.updateStack.mock.calls).toEqual([
        ["testament-id", "StackTestament", StackUpdatePacings.Regular],
        ["testament-id", "StackTestament", StackUpdatePacings.Instant],
      ]);
      expect(
        pieceActivityServicePort.updateAllNotifications
      ).toHaveBeenCalledTimes(2);
      expect(bibleStackEventPort.emit.mock.calls).toEqual([
        ["OnStackSectionExploded", { sectionData: firstSection }],
        ["OnStackSectionExploded", { sectionData: secondSection }],
      ]);
      expect(executionOrder).toEqual([
        "updateStack",
        "updateAllNotifications",
        "emit",
        "updateStack",
        "updateAllNotifications",
        "emit",
      ]);
    });
  });

  describe("registerExplodedSection", () => {
    it("successfully registers the current exploded section", () => {
      const section = makeSection();

      expect(service.currentExplodedSection).toBeUndefined();

      service.registerExplodedSection(section);

      expect(service.currentExplodedSection).toBe(section);
    });

    it("works with consecutive calls", () => {
      const firstSection = makeSection({ id: "first-section" });
      const secondSection = makeSection({ id: "second-section" });

      service.registerExplodedSection(firstSection);

      expect(service.currentExplodedSection).toBe(firstSection);

      service.registerExplodedSection(secondSection);

      expect(service.currentExplodedSection).toBe(secondSection);
    });
  });
});
