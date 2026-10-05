import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TestamentStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TestamentStackUpdaterService";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  BookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";
import type { BookStackUpdaterServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookStackUpdater";
import type { SectionStackUpdaterServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionStackUpdater";
import type { TestamentStackUpdaterPort as UpdaterAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/TestamentStackUpdater";

const BIBLE_ID = "bible-id";
const TESTAMENT_ID = "testament-id";

const bookInfo: BookInfo = {
  type: "complete",
  bookId: "book-info-id",
  author: "book-author",
  chaptersVerseCount: [10, 20, 30],
  relativeDateRange: { min: 1000, max: 2000 },
  numberOfChapters: 3,
  path: {
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
};

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: [bookInfo],
  path: {
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

const testamentInfo: TestamentInfo = {
  name: "testament",
  color: "#ffffff",
  sections: [sectionInfo],
};

const sectionCreationParams = {
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  amountOfChaptersInSection: 3,
};

const makeBookData = ({
  id,
  isActive = true,
}: {
  id: string;
  isActive?: boolean;
}): StackBookData =>
  new StackBookData({
    id,
    piece: { id: `${id}-piece`, type: "StackBook" },
    pieceInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    isActive,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      levelIndex: 0,
      bookIndex: 0,
      bookLevelIndex: 0,
      levelsLenght: 1,
    },
  });

const makeSectionData = ({
  id,
  isActive = true,
  isSplitIntoBooks = false,
  books = [],
}: {
  id: string;
  isActive?: boolean;
  isSplitIntoBooks?: boolean;
  books?: StackBookData[];
}): StackSectionData =>
  new StackSectionData({
    id,
    piece: { id: `${id}-piece`, type: "StackSection" },
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    childrenData: [books],
    isSplitIntoBooks,
    isActive,
    creationParams: sectionCreationParams,
  });

const makeSectionBookData = ({
  id,
  isActive = true,
}: {
  id: string;
  isActive?: boolean;
}): StackSectionBookData =>
  new StackSectionBookData({
    id,
    piece: { id: `${id}-piece`, type: "StackSectionBook" },
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    isActive,
    creationParams: sectionCreationParams,
  });

const makeTestamentData = ({
  isSplitIntoSections = true,
  childrenData = [],
}: {
  isSplitIntoSections?: boolean;
  childrenData?: (StackSectionData | StackSectionBookData)[];
} = {}): StackTestamentData =>
  new StackTestamentData({
    id: TESTAMENT_ID,
    piece: { id: `${TESTAMENT_ID}-piece`, type: "StackTestament" },
    pieceInfo: testamentInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    childrenData,
    isSplitIntoSections,
    isActive: true,
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
  });

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const trackSettlement = (promise: Promise<unknown>) => {
  const state = { settled: false };
  promise.then(
    () => {
      state.settled = true;
    },
    () => {
      state.settled = true;
    }
  );
  return state;
};

describe("pattern.bible-stack.application.services.TestamentStackUpdaterService", () => {
  let service: TestamentStackUpdaterService;
  let updaterAdapterPort: Mocked<UpdaterAdapterPort>;
  let sectionUpdaterPort: Mocked<SectionStackUpdaterServicePort>;
  let bookStackUpdaterPort: Mocked<BookStackUpdaterServicePort>;
  let callOrder: string[];

  const makeChildren = () => {
    const section_1 = makeSectionData({ id: "section-1" });
    const inactiveSection = makeSectionData({
      id: "inactive-section",
      isActive: false,
    });
    const sectionBook_1 = makeSectionBookData({ id: "section-book-1" });
    const inactiveSectionBook = makeSectionBookData({
      id: "inactive-section-book",
      isActive: false,
    });
    const section_2 = makeSectionData({ id: "section-2" });
    const sectionBook_2 = makeSectionBookData({ id: "section-book-2" });
    return {
      section_1,
      section_2,
      sectionBook_1,
      sectionBook_2,
      childrenData: [
        section_1,
        inactiveSection,
        sectionBook_1,
        inactiveSectionBook,
        section_2,
        sectionBook_2,
      ],
    };
  };

  const makeEmptyTestaments = () => [
    makeTestamentData(),
    makeTestamentData({
      childrenData: [
        makeSectionData({ id: "inactive-section", isActive: false }),
        makeSectionBookData({ id: "inactive-section-book", isActive: false }),
        makeSectionData({
          id: "active-section-without-active-books",
          isSplitIntoBooks: true,
          books: [makeBookData({ id: "inactive-book", isActive: false })],
        }),
      ],
    }),
  ];

  const expectNoInteractions = () => {
    expect(sectionUpdaterPort.prepareSection).not.toHaveBeenCalled();
    expect(bookStackUpdaterPort.prepareBook).not.toHaveBeenCalled();
    expect(updaterAdapterPort.update).not.toHaveBeenCalled();
    expect(sectionUpdaterPort.finalizeSection).not.toHaveBeenCalled();
    expect(bookStackUpdaterPort.finalizeBook).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    callOrder = [];

    updaterAdapterPort = {
      update: vi.fn(async () => {
        callOrder.push("update");
      }),
    };

    sectionUpdaterPort = {
      prepareSection: vi.fn((data) => {
        callOrder.push(`prepareSection:${data.id}`);
      }),
      finalizeSection: vi.fn(async (data) => {
        callOrder.push(`finalizeSection:${data.id}`);
      }),
      update: vi.fn(),
    };

    bookStackUpdaterPort = {
      prepareBook: vi.fn((command) => {
        callOrder.push(`prepareBook:${command.data.id}`);
        return true;
      }),
      finalizeBook: vi.fn(async (data) => {
        callOrder.push(`finalizeBook:${data.id}`);
      }),
      update: vi.fn(),
    };

    service = new TestamentStackUpdaterService({
      updaterAdapterPort,
      sectionUpdaterPort,
      bookStackUpdaterPort,
    });
  });

  describe("prepareTestament", () => {
    it("no-ops if testament is not selected", () => {
      const { childrenData } = makeChildren();
      const data = makeTestamentData({
        isSplitIntoSections: false,
        childrenData,
      });

      service.prepareTestament(data);

      expectNoInteractions();
    });

    it("no-ops if testament is empty", () => {
      for (const data of makeEmptyTestaments()) {
        service.prepareTestament(data);
      }

      expectNoInteractions();
    });

    it("prepares every active section child", () => {
      const { section_1, section_2, childrenData } = makeChildren();
      const data = makeTestamentData({ childrenData });

      service.prepareTestament(data);

      expect(sectionUpdaterPort.prepareSection.mock.calls).toEqual([
        [section_1],
        [section_2],
      ]);
      expect(sectionUpdaterPort.prepareSection.mock.calls[0]![0]).toBe(
        section_1
      );
      expect(sectionUpdaterPort.prepareSection.mock.calls[1]![0]).toBe(
        section_2
      );
    });

    it("prepares every active section book child", () => {
      const { sectionBook_1, sectionBook_2, childrenData } = makeChildren();
      const data = makeTestamentData({ childrenData });

      service.prepareTestament(data);

      expect(bookStackUpdaterPort.prepareBook.mock.calls).toEqual([
        [{ data: sectionBook_1 }],
        [{ data: sectionBook_2 }],
      ]);
      expect(callOrder).toEqual([
        "prepareSection:section-1",
        "prepareBook:section-book-1",
        "prepareSection:section-2",
        "prepareBook:section-book-2",
      ]);
      expect(updaterAdapterPort.update).not.toHaveBeenCalled();
      expect(sectionUpdaterPort.finalizeSection).not.toHaveBeenCalled();
      expect(bookStackUpdaterPort.finalizeBook).not.toHaveBeenCalled();
    });
  });

  describe("finalizeTestament", () => {
    it("no-ops if testament is not selected", async () => {
      const { childrenData } = makeChildren();
      const data = makeTestamentData({
        isSplitIntoSections: false,
        childrenData,
      });

      await expect(service.finalizeTestament(data)).resolves.toBeUndefined();

      expectNoInteractions();
    });

    it("no-ops if testament is empty", async () => {
      for (const data of makeEmptyTestaments()) {
        await expect(service.finalizeTestament(data)).resolves.toBeUndefined();
      }

      expectNoInteractions();
    });

    it("awaits in batch for every active child's finalization", async () => {
      const {
        section_1,
        section_2,
        sectionBook_1,
        sectionBook_2,
        childrenData,
      } = makeChildren();
      const data = makeTestamentData({ childrenData });
      const sectionFinalizations = [makeDeferred(), makeDeferred()];
      const bookFinalizations = [makeDeferred(), makeDeferred()];
      sectionUpdaterPort.finalizeSection
        .mockReturnValueOnce(sectionFinalizations[0]!.promise)
        .mockReturnValueOnce(sectionFinalizations[1]!.promise);
      bookStackUpdaterPort.finalizeBook
        .mockReturnValueOnce(bookFinalizations[0]!.promise)
        .mockReturnValueOnce(bookFinalizations[1]!.promise);

      const finalization = service.finalizeTestament(data);
      const state = trackSettlement(finalization);
      await flush();

      expect(sectionUpdaterPort.finalizeSection.mock.calls).toEqual([
        [section_1],
        [section_2],
      ]);
      expect(bookStackUpdaterPort.finalizeBook.mock.calls).toEqual([
        [sectionBook_1],
        [sectionBook_2],
      ]);
      expect(state.settled).toBe(false);

      sectionFinalizations[0]!.resolve();
      sectionFinalizations[1]!.resolve();
      bookFinalizations[1]!.resolve();
      await flush();

      expect(state.settled).toBe(false);

      bookFinalizations[0]!.resolve();

      await expect(finalization).resolves.toBeUndefined();
      expect(sectionUpdaterPort.prepareSection).not.toHaveBeenCalled();
      expect(bookStackUpdaterPort.prepareBook).not.toHaveBeenCalled();
      expect(updaterAdapterPort.update).not.toHaveBeenCalled();
    });

    it("throws if any of the finalize sequences rejects", async () => {
      const sectionError = new Error("section finalization rejected");
      sectionUpdaterPort.finalizeSection.mockRejectedValueOnce(sectionError);

      await expect(
        service.finalizeTestament(
          makeTestamentData({ childrenData: makeChildren().childrenData })
        )
      ).rejects.toBe(sectionError);

      const bookError = new Error("book finalization rejected");
      bookStackUpdaterPort.finalizeBook
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(bookError);

      await expect(
        service.finalizeTestament(
          makeTestamentData({ childrenData: makeChildren().childrenData })
        )
      ).rejects.toBe(bookError);
    });
  });

  describe("update", () => {
    it("no-ops if testament is not selected", async () => {
      const { childrenData } = makeChildren();
      const data = makeTestamentData({
        isSplitIntoSections: false,
        childrenData,
      });

      await expect(
        service.update({ data, pacing: StackUpdatePacings.Regular })
      ).resolves.toBeUndefined();

      expectNoInteractions();
    });

    it("no-ops if testament is empty", async () => {
      for (const data of makeEmptyTestaments()) {
        await expect(
          service.update({ data, pacing: StackUpdatePacings.Regular })
        ).resolves.toBeUndefined();
      }

      expectNoInteractions();
    });

    it("prepares the testament", async () => {
      const {
        section_1,
        section_2,
        sectionBook_1,
        sectionBook_2,
        childrenData,
      } = makeChildren();
      const data = makeTestamentData({ childrenData });

      await service.update({ data, pacing: StackUpdatePacings.Regular });

      expect(sectionUpdaterPort.prepareSection.mock.calls).toEqual([
        [section_1],
        [section_2],
      ]);
      expect(bookStackUpdaterPort.prepareBook.mock.calls).toEqual([
        [{ data: sectionBook_1 }],
        [{ data: sectionBook_2 }],
      ]);
      expect(callOrder.slice(0, 4)).toEqual([
        "prepareSection:section-1",
        "prepareBook:section-book-1",
        "prepareSection:section-2",
        "prepareBook:section-book-2",
      ]);
    });

    it("awaits for the update sequence, after the preparation", async () => {
      const { childrenData } = makeChildren();
      const data = makeTestamentData({ childrenData });
      const adapterUpdate = makeDeferred();
      updaterAdapterPort.update.mockImplementationOnce(() => {
        callOrder.push("update");
        return adapterUpdate.promise;
      });

      const update = service.update({ data, pacing: StackUpdatePacings.Fast });
      await flush();

      expect(updaterAdapterPort.update).toHaveBeenCalledExactlyOnceWith({
        data,
        pacing: StackUpdatePacings.Fast,
      });
      expect(callOrder).toEqual([
        "prepareSection:section-1",
        "prepareBook:section-book-1",
        "prepareSection:section-2",
        "prepareBook:section-book-2",
        "update",
      ]);
      expect(sectionUpdaterPort.finalizeSection).not.toHaveBeenCalled();
      expect(bookStackUpdaterPort.finalizeBook).not.toHaveBeenCalled();

      adapterUpdate.resolve();
      await update;

      expect(sectionUpdaterPort.finalizeSection).toHaveBeenCalledTimes(2);
      expect(bookStackUpdaterPort.finalizeBook).toHaveBeenCalledTimes(2);
    });

    it("throws if the update sequence rejects", async () => {
      const { childrenData } = makeChildren();
      const data = makeTestamentData({ childrenData });
      const error = new Error("update rejected");
      updaterAdapterPort.update.mockRejectedValueOnce(error);

      await expect(
        service.update({ data, pacing: StackUpdatePacings.Regular })
      ).rejects.toBe(error);

      expect(sectionUpdaterPort.prepareSection).toHaveBeenCalledTimes(2);
      expect(bookStackUpdaterPort.prepareBook).toHaveBeenCalledTimes(2);
      expect(sectionUpdaterPort.finalizeSection).not.toHaveBeenCalled();
      expect(bookStackUpdaterPort.finalizeBook).not.toHaveBeenCalled();
    });

    it("awaits for the finalize sequence, after the update", async () => {
      const {
        section_1,
        section_2,
        sectionBook_1,
        sectionBook_2,
        childrenData,
      } = makeChildren();
      const data = makeTestamentData({ childrenData });
      const sectionFinalization = makeDeferred();
      sectionUpdaterPort.finalizeSection.mockImplementationOnce((section) => {
        callOrder.push(`finalizeSection:${section.id}`);
        return sectionFinalization.promise;
      });

      const update = service.update({
        data,
        pacing: StackUpdatePacings.Regular,
      });
      const state = trackSettlement(update);
      await flush();

      expect(sectionUpdaterPort.finalizeSection.mock.calls).toEqual([
        [section_1],
        [section_2],
      ]);
      expect(bookStackUpdaterPort.finalizeBook.mock.calls).toEqual([
        [sectionBook_1],
        [sectionBook_2],
      ]);
      expect(callOrder.slice(4)).toEqual([
        "update",
        "finalizeSection:section-1",
        "finalizeBook:section-book-1",
        "finalizeSection:section-2",
        "finalizeBook:section-book-2",
      ]);
      expect(state.settled).toBe(false);

      sectionFinalization.resolve();

      await expect(update).resolves.toBeUndefined();
    });

    it("throws if the finalize sequence rejects", async () => {
      const { childrenData } = makeChildren();
      const data = makeTestamentData({ childrenData });
      const error = new Error("finalization rejected");
      bookStackUpdaterPort.finalizeBook.mockRejectedValueOnce(error);

      await expect(
        service.update({ data, pacing: StackUpdatePacings.Regular })
      ).rejects.toBe(error);

      expect(updaterAdapterPort.update).toHaveBeenCalledOnce();
    });

    it("works a second time", async () => {
      const { childrenData } = makeChildren();
      const data = makeTestamentData({ childrenData });
      const cycle = (pacing: string) => [
        "prepareSection:section-1",
        "prepareBook:section-book-1",
        "prepareSection:section-2",
        "prepareBook:section-book-2",
        "update",
        "finalizeSection:section-1",
        "finalizeBook:section-book-1",
        "finalizeSection:section-2",
        "finalizeBook:section-book-2",
        `done:${pacing}`,
      ];

      await service.update({ data, pacing: StackUpdatePacings.Regular });
      callOrder.push(`done:${StackUpdatePacings.Regular}`);
      await service.update({ data, pacing: StackUpdatePacings.Slow });
      callOrder.push(`done:${StackUpdatePacings.Slow}`);

      expect(callOrder).toEqual([
        ...cycle(StackUpdatePacings.Regular),
        ...cycle(StackUpdatePacings.Slow),
      ]);
      expect(updaterAdapterPort.update.mock.calls).toEqual([
        [{ data, pacing: StackUpdatePacings.Regular }],
        [{ data, pacing: StackUpdatePacings.Slow }],
      ]);
    });
  });
});
