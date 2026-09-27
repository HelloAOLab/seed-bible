import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { StackUpdateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackUpdateService";
import type { PieceInteractabilityServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceInteractability";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackUpdate";
import type { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import type { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";
import type { BibleStackUpdaterServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleStackUpdater";
import type { TestamentStackUpdaterServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentStackUpdater";
import type { BookStackUpdaterServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookStackUpdater";
import type { SectionStackUpdaterServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionStackUpdater";

const bibleData = { id: "bible-id" } as unknown as StackBibleData;
const testamentData = { id: "testament-id" } as unknown as StackTestamentData;
const sectionData = { id: "section-id" } as unknown as StackSectionData;
const sectionBookData = {
  id: "section-book-id",
} as unknown as StackSectionBookData;
const bookData = { id: "book-id" } as unknown as StackBookData;

const createDeferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("pattern.bible-stack.application.services.StackUpdateService", () => {
  let service: StackUpdateService;
  let pieceInteractabilityPort: Mocked<
    PieceInteractabilityServicePort & PieceInteractabilityServicePort
  >;
  let bibleStackUpdaterPort: Mocked<BibleStackUpdaterServicePort>;
  let testamentStackUpdaterPort: Mocked<TestamentStackUpdaterServicePort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let sectionStackUpdaterPort: Mocked<SectionStackUpdaterServicePort>;
  let bookStackUpdaterPort: Mocked<BookStackUpdaterServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    pieceInteractabilityPort = {
      blockAll: vi.fn(),
      unlockAll: vi.fn(),
    };

    bibleStackUpdaterPort = {
      update: vi.fn(async () => {}),
    };

    testamentStackUpdaterPort = {
      prepareTestament: vi.fn(),
      finalizeTestament: vi.fn(),
      update: vi.fn(async () => {}),
    };

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(() => [bibleData]),
      getBibleDataById: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getStandaloneTestaments: vi.fn(() => [testamentData]),
      getStandaloneSections: vi.fn(() => [sectionData]),
      getStandaloneSectionBooks: vi.fn(() => [sectionBookData]),
      getStandaloneBooks: vi.fn(() => [bookData]),
      getDataById: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    sectionStackUpdaterPort = {
      prepareSection: vi.fn(),
      finalizeSection: vi.fn(),
      update: vi.fn(async () => {}),
    };

    bookStackUpdaterPort = {
      prepareBook: vi.fn(),
      finalizeBook: vi.fn(),
      update: vi.fn(async () => {}),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new StackUpdateService({
      pieceInteractabilityPort,
      bibleStackUpdaterPort,
      testamentStackUpdaterPort,
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
      sectionStackUpdaterPort,
      bookStackUpdaterPort,
      loggerPort,
    });
  });

  describe("updateAllStacks", () => {
    it("enqueues the update if there's an ongoing update", async () => {
      const ongoingUpdate = createDeferred();
      bibleStackUpdaterPort.update.mockReturnValueOnce(ongoingUpdate.promise);

      const firstUpdate = service.updateAllStacks(StackUpdatePacings.Regular);
      await service.updateAllStacks(StackUpdatePacings.Regular);

      expect(bibleDataRepositoryPort.getAllBiblesData).toHaveBeenCalledTimes(1);
      expect(bibleStackUpdaterPort.update).toHaveBeenCalledTimes(1);
      expect(pieceInteractabilityPort.blockAll).toHaveBeenCalledTimes(1);

      ongoingUpdate.resolve();
      await firstUpdate;
    });

    it("sets isUpdating to true", async () => {
      const ongoingUpdate = createDeferred();
      bibleStackUpdaterPort.update.mockReturnValueOnce(ongoingUpdate.promise);

      const firstUpdate = service.updateAllStacks(StackUpdatePacings.Regular);
      const secondUpdate = service.updateAllStacks(StackUpdatePacings.Regular);

      await expect(secondUpdate).resolves.toBeUndefined();
      expect(
        pieceDataRepositoryPort.getStandaloneTestaments
      ).toHaveBeenCalledTimes(1);
      expect(pieceDataRepositoryPort.getStandaloneBooks).toHaveBeenCalledTimes(
        1
      );

      ongoingUpdate.resolve();
      await firstUpdate;
    });

    it("blocks all the pieces", async () => {
      let wasBlockedBeforeUpdating = false;
      bibleStackUpdaterPort.update.mockImplementationOnce(async () => {
        wasBlockedBeforeUpdating =
          pieceInteractabilityPort.blockAll.mock.calls.length === 1 &&
          pieceInteractabilityPort.unlockAll.mock.calls.length === 0;
      });

      await service.updateAllStacks(StackUpdatePacings.Regular);

      expect(pieceInteractabilityPort.blockAll).toHaveBeenCalledTimes(1);
      expect(wasBlockedBeforeUpdating).toBe(true);
    });

    it("updates every found bible and standalone piece stack in batch", async () => {
      const bibleUpdate = createDeferred();
      bibleStackUpdaterPort.update.mockReturnValueOnce(bibleUpdate.promise);

      const update = service.updateAllStacks(StackUpdatePacings.Fast);

      expect(bibleStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: bibleData,
        pacing: StackUpdatePacings.Fast,
      });
      expect(testamentStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: testamentData,
        pacing: StackUpdatePacings.Fast,
      });
      expect(sectionStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: sectionData,
        pacing: StackUpdatePacings.Fast,
      });
      expect(bookStackUpdaterPort.update).toHaveBeenCalledTimes(2);
      expect(bookStackUpdaterPort.update).toHaveBeenCalledWith({
        data: sectionBookData,
        pacing: StackUpdatePacings.Fast,
      });
      expect(bookStackUpdaterPort.update).toHaveBeenCalledWith({
        data: bookData,
        pacing: StackUpdatePacings.Fast,
      });
      expect(pieceInteractabilityPort.unlockAll).not.toHaveBeenCalled();

      bibleUpdate.resolve();
      await update;

      expect(pieceInteractabilityPort.unlockAll).toHaveBeenCalledTimes(1);
    });

    it("catches and logs the error if any update rejects", async () => {
      const error = new Error("update failed");
      sectionStackUpdaterPort.update.mockRejectedValueOnce(error);

      await expect(
        service.updateAllStacks(StackUpdatePacings.Regular)
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "StackUpdateService: Error while updating stacks at updateAllStacks",
        { error }
      );
    });

    it("finally unlocks all the pieces", async () => {
      await service.updateAllStacks(StackUpdatePacings.Regular);

      expect(pieceInteractabilityPort.unlockAll).toHaveBeenCalledTimes(1);

      bookStackUpdaterPort.update.mockRejectedValueOnce(new Error("failed"));
      await service.updateAllStacks(StackUpdatePacings.Regular);

      expect(pieceInteractabilityPort.unlockAll).toHaveBeenCalledTimes(2);
    });

    it("finally sets isUpdating to false", async () => {
      bibleStackUpdaterPort.update.mockRejectedValueOnce(new Error("failed"));
      await service.updateAllStacks(StackUpdatePacings.Regular);

      await service.updateAllStacks(StackUpdatePacings.Regular);

      expect(bibleDataRepositoryPort.getAllBiblesData).toHaveBeenCalledTimes(2);
      expect(pieceInteractabilityPort.blockAll).toHaveBeenCalledTimes(2);
      expect(pieceInteractabilityPort.unlockAll).toHaveBeenCalledTimes(2);
    });

    it("updates all stacks again if there's a queued update at the end", async () => {
      const ongoingUpdate = createDeferred();
      bibleStackUpdaterPort.update.mockReturnValueOnce(ongoingUpdate.promise);

      const firstUpdate = service.updateAllStacks(StackUpdatePacings.Regular);
      await service.updateAllStacks(StackUpdatePacings.Regular);
      await service.updateAllStacks(StackUpdatePacings.Regular);

      expect(bibleStackUpdaterPort.update).toHaveBeenCalledTimes(1);

      ongoingUpdate.resolve();
      await firstUpdate;

      expect(bibleDataRepositoryPort.getAllBiblesData).toHaveBeenCalledTimes(2);
      expect(bibleStackUpdaterPort.update).toHaveBeenCalledTimes(2);
      expect(bibleStackUpdaterPort.update).toHaveBeenLastCalledWith({
        data: bibleData,
        pacing: StackUpdatePacings.Regular,
      });
      expect(pieceInteractabilityPort.blockAll).toHaveBeenCalledTimes(2);
    });

    it("resolves only after the queued update finishes", async () => {
      const ongoingUpdate = createDeferred();
      const queuedUpdate = createDeferred();
      bibleStackUpdaterPort.update
        .mockReturnValueOnce(ongoingUpdate.promise)
        .mockReturnValueOnce(queuedUpdate.promise);
      let hasFirstUpdateResolved = false;

      const firstUpdate = service
        .updateAllStacks(StackUpdatePacings.Regular)
        .then(() => {
          hasFirstUpdateResolved = true;
        });
      await service.updateAllStacks(StackUpdatePacings.Regular);

      ongoingUpdate.resolve();
      await vi.waitFor(() => {
        expect(bibleStackUpdaterPort.update).toHaveBeenCalledTimes(2);
      });
      await Promise.resolve();

      expect(hasFirstUpdateResolved).toBe(false);
      expect(pieceInteractabilityPort.unlockAll).toHaveBeenCalledTimes(1);

      queuedUpdate.resolve();
      await firstUpdate;

      expect(hasFirstUpdateResolved).toBe(true);
      expect(pieceInteractabilityPort.unlockAll).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateStack", () => {
    it("updates the stack if the data is found, otherwise no-ops", async () => {
      const pacing = StackUpdatePacings.Slow;
      bibleDataRepositoryPort.getBibleDataById.mockImplementation((id) =>
        id === bibleData.id ? bibleData : undefined
      );
      pieceDataRepositoryPort.getDataById.mockImplementation(
        ({ id }) =>
          [testamentData, sectionData, sectionBookData, bookData].find(
            (data) => data.id === id
          ) as never
      );

      await service.updateStack(bibleData.id, "StackBible", pacing);
      await service.updateStack(testamentData.id, "StackTestament", pacing);
      await service.updateStack(sectionData.id, "StackSection", pacing);
      await service.updateStack(sectionBookData.id, "StackSectionBook", pacing);
      await service.updateStack(bookData.id, "StackBook", pacing);

      expect(bibleDataRepositoryPort.getBibleDataById).toHaveBeenCalledWith(
        bibleData.id
      );
      expect(pieceDataRepositoryPort.getDataById).toHaveBeenCalledWith({
        type: "StackTestament",
        id: testamentData.id,
      });
      expect(pieceDataRepositoryPort.getDataById).toHaveBeenCalledWith({
        type: "StackSection",
        id: sectionData.id,
      });
      expect(pieceDataRepositoryPort.getDataById).toHaveBeenCalledWith({
        type: "StackSectionBook",
        id: sectionBookData.id,
      });
      expect(pieceDataRepositoryPort.getDataById).toHaveBeenCalledWith({
        type: "StackBook",
        id: bookData.id,
      });
      expect(bibleStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: bibleData,
        pacing,
      });
      expect(testamentStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: testamentData,
        pacing,
      });
      expect(sectionStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: sectionData,
        pacing,
      });
      expect(bookStackUpdaterPort.update).toHaveBeenCalledTimes(2);
      expect(bookStackUpdaterPort.update).toHaveBeenNthCalledWith(1, {
        data: sectionBookData,
        pacing,
      });
      expect(bookStackUpdaterPort.update).toHaveBeenNthCalledWith(2, {
        data: bookData,
        pacing,
      });

      await service.updateStack("missing-id", "StackBible", pacing);
      await service.updateStack("missing-id", "StackTestament", pacing);
      await service.updateStack("missing-id", "StackSection", pacing);
      await service.updateStack("missing-id", "StackSectionBook", pacing);
      await service.updateStack("missing-id", "StackBook", pacing);

      expect(bibleStackUpdaterPort.update).toHaveBeenCalledTimes(1);
      expect(testamentStackUpdaterPort.update).toHaveBeenCalledTimes(1);
      expect(sectionStackUpdaterPort.update).toHaveBeenCalledTimes(1);
      expect(bookStackUpdaterPort.update).toHaveBeenCalledTimes(2);
    });
  });
});
