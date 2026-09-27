import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionStackUpdaterService";
import type {
  LoggerPort,
  SectionStackUpdaterPort as UpdaterAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackSectionUpdater";
import type { StackPieceLifecycleAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieceLifecycle";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type {
  Piece,
  SectionShadow,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";
import type { BookStackUpdaterServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookStackUpdater";
import type { PieceLabelServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLabel";
import type { StackLabelableBiblePiece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieceLifecycle";
import { makePieceLabelServiceDouble } from "../serviceDoubles";

const BIBLE_ID = "bible-id";
const SECTION_ID = "section-id";

const sectionPiece: Piece<"StackSection"> = {
  id: "section-piece",
  type: "StackSection",
};

const sectionShadow: SectionShadow = {
  id: "section-shadow",
  type: "StackSectionShadow",
  sectionDataId: SECTION_ID,
};

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
    parentDataIds: { stackBibleId: BIBLE_ID, stackSectionId: SECTION_ID },
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
  isSplitIntoBooks = true,
  isInExplodedView = false,
  books = [],
  shadow,
}: {
  isSplitIntoBooks?: boolean;
  isInExplodedView?: boolean;
  books?: StackBookData[];
  shadow?: SectionShadow;
} = {}): StackSectionData => {
  const data = new StackSectionData({
    id: SECTION_ID,
    piece: sectionPiece,
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    childrenData: [books],
    isSplitIntoBooks,
    isInExplodedView,
    isActive: true,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

  if (shadow) {
    data.attachShadow(shadow);
  }

  return data;
};

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

describe("pattern.bible-stack.application.services.SectionStackUpdaterService", () => {
  let service: SectionStackUpdaterService;
  let updaterAdapterPort: Mocked<UpdaterAdapterPort>;
  let bookStackUpdaterPort: Mocked<BookStackUpdaterServicePort>;
  let pieceLifecyclePort: Mocked<StackPieceLifecycleAdapterPort>;
  let pieceLabelServicePort: Mocked<
    PieceLabelServicePort<StackLabelableBiblePiece>
  >;
  let loggerPort: Mocked<LoggerPort>;
  let callOrder: string[];

  beforeEach(() => {
    callOrder = [];

    updaterAdapterPort = {
      update: vi.fn(async () => {
        callOrder.push("update");
      }),
    };

    bookStackUpdaterPort = {
      prepareBook: vi.fn(() => {
        callOrder.push("prepareBook");
        return true;
      }),
      finalizeBook: vi.fn(async () => {
        callOrder.push("finalizeBook");
      }),
      update: vi.fn(),
    };

    pieceLifecyclePort = {
      spawnTestament: vi.fn(),
      despawnTestament: vi.fn(),
      spawnSection: vi.fn(),
      despawnSection: vi.fn(),
      spawnBook: vi.fn(),
      despawnBook: vi.fn(),
      spawnChapter: vi.fn(),
      despawnChapter: vi.fn(),
      spawnSectionShadow: vi.fn(),
      spawnSectionShadowDomain: vi.fn(() => {
        callOrder.push("spawnSectionShadowDomain");
        return sectionShadow;
      }),
      despawnSectionShadow: vi.fn(),
      despawnSectionBook: vi.fn(),
      spawnVersesBundle: vi.fn(),
      despawnVersesBundle: vi.fn(),
      spawnVerse: vi.fn(),
      despawnVerse: vi.fn(),
      despawn: vi.fn(),
    };

    pieceLabelServicePort = makePieceLabelServiceDouble({
      showLabel: vi.fn(async () => {
        callOrder.push("showLabel");
      }),
      hideLabel: vi.fn(async () => {
        callOrder.push("hideLabel");
      }),
    });

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new SectionStackUpdaterService({
      updaterAdapterPort,
      bookStackUpdaterPort,
      pieceLifecyclePort,
      pieceLabelServicePort,
      loggerPort,
    });
  });

  describe("prepareSection", () => {
    it("no-ops if section is not split", () => {
      const data = makeSectionData({
        isSplitIntoBooks: false,
        books: [makeBookData({ id: "book-1" })],
      });

      service.prepareSection(data);

      expect(data.shadow).toBeUndefined();
      expect(data.shadowNeedsReveal).toBe(false);
      expect(
        pieceLifecyclePort.spawnSectionShadowDomain
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(bookStackUpdaterPort.prepareBook).not.toHaveBeenCalled();
    });

    it("spawns and attaches a shadow if there is none already attached, and marks it for reveal", () => {
      const withoutShadow = makeSectionData();

      service.prepareSection(withoutShadow);

      expect(pieceLifecyclePort.spawnSectionShadowDomain).toHaveBeenCalledWith(
        SECTION_ID
      );
      expect(withoutShadow.shadow).toBe(sectionShadow);
      expect(withoutShadow.shadowNeedsReveal).toBe(true);

      vi.clearAllMocks();

      const attachedShadow: SectionShadow = {
        id: "attached-shadow",
        type: "StackSectionShadow",
        sectionDataId: SECTION_ID,
      };
      const withShadow = makeSectionData({ shadow: attachedShadow });

      service.prepareSection(withShadow);

      expect(
        pieceLifecyclePort.spawnSectionShadowDomain
      ).not.toHaveBeenCalled();
      expect(withShadow.shadow).toBe(attachedShadow);
      expect(withShadow.shadowNeedsReveal).toBe(false);
    });

    it("hides the shadow's label if the section is not in exploded view", () => {
      const imploded = makeSectionData({
        isInExplodedView: false,
        shadow: sectionShadow,
      });

      service.prepareSection(imploded);

      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledTimes(1);
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledWith(
        sectionShadow
      );

      vi.clearAllMocks();

      const exploded = makeSectionData({
        isInExplodedView: true,
        shadow: sectionShadow,
      });

      service.prepareSection(exploded);

      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
    });

    it("prepares every active book at the end", () => {
      const book_1 = makeBookData({ id: "book-1" });
      const book_2 = makeBookData({ id: "book-2" });
      const inactiveBook = makeBookData({
        id: "inactive-book",
        isActive: false,
      });
      const data = makeSectionData({ books: [book_1, inactiveBook, book_2] });

      service.prepareSection(data);

      expect(bookStackUpdaterPort.prepareBook.mock.calls).toEqual([
        [{ data: book_1, sectionData: data }],
        [{ data: book_2, sectionData: data }],
      ]);
      expect(callOrder).toEqual([
        "spawnSectionShadowDomain",
        "hideLabel",
        "prepareBook",
        "prepareBook",
      ]);
    });
  });

  describe("finalizeSection", () => {
    it("awaits the finalization of all the active child books in batch if the section is split", async () => {
      const book_1 = makeBookData({ id: "book-1" });
      const book_2 = makeBookData({ id: "book-2" });
      const inactiveBook = makeBookData({
        id: "inactive-book",
        isActive: false,
      });
      const data = makeSectionData({
        isInExplodedView: true,
        books: [book_1, inactiveBook, book_2],
        shadow: sectionShadow,
      });
      const finalization_1 = makeDeferred();
      const finalization_2 = makeDeferred();
      bookStackUpdaterPort.finalizeBook
        .mockReturnValueOnce(finalization_1.promise)
        .mockReturnValueOnce(finalization_2.promise);

      const finalization = service.finalizeSection(data);
      const state = trackSettlement(finalization);
      await flush();

      expect(bookStackUpdaterPort.finalizeBook.mock.calls).toEqual([
        [book_1],
        [book_2],
      ]);
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();

      finalization_1.resolve();
      await flush();

      expect(state.settled).toBe(false);
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();

      finalization_2.resolve();
      await finalization;

      expect(pieceLabelServicePort.showLabel).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      const notSplit = makeSectionData({
        isSplitIntoBooks: false,
        books: [makeBookData({ id: "book-3" })],
      });

      await service.finalizeSection(notSplit);

      expect(bookStackUpdaterPort.finalizeBook).not.toHaveBeenCalled();
    });

    it("omits the rest if there is no shadow attached", async () => {
      const book = makeBookData({ id: "book-1" });

      for (const isInExplodedView of [true, false]) {
        vi.clearAllMocks();

        const data = makeSectionData({ isInExplodedView, books: [book] });

        await expect(service.finalizeSection(data)).resolves.toBeUndefined();

        expect(bookStackUpdaterPort.finalizeBook).toHaveBeenCalledWith(book);
        expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
        expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });

    it("awaits the label show in the shadow if the section is exploded", async () => {
      const data = makeSectionData({
        isInExplodedView: true,
        shadow: sectionShadow,
      });
      const show = makeDeferred();
      pieceLabelServicePort.showLabel.mockImplementation(() => show.promise);

      const finalization = service.finalizeSection(data);
      const state = trackSettlement(finalization);
      await flush();

      expect(pieceLabelServicePort.showLabel).toHaveBeenCalledWith({
        piece: sectionShadow,
        translucencyMode: "Solid",
      });
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(state.settled).toBe(false);

      show.resolve();
      await finalization;

      expect(state.settled).toBe(true);
    });

    it("awaits the label hide in the shadow if the section is imploded", async () => {
      const data = makeSectionData({
        isInExplodedView: false,
        shadow: sectionShadow,
      });
      const hide = makeDeferred();
      pieceLabelServicePort.hideLabel.mockReturnValue(hide.promise);

      const finalization = service.finalizeSection(data);
      const state = trackSettlement(finalization);
      await flush();

      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledWith(
        sectionShadow
      );
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
      expect(state.settled).toBe(false);

      hide.resolve();
      await finalization;

      expect(state.settled).toBe(true);
    });

    it("catches and logs the error if the show or hide sequences reject", async () => {
      const showError = new Error("showLabel failed");
      pieceLabelServicePort.showLabel.mockImplementation(() =>
        Promise.reject(showError)
      );

      await expect(
        service.finalizeSection(
          makeSectionData({ isInExplodedView: true, shadow: sectionShadow })
        )
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledTimes(1);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "SectionStackUpdaterService: label sequence failed at finalizeSection",
        showError
      );

      vi.clearAllMocks();

      const hideError = new Error("hideLabel failed");
      pieceLabelServicePort.hideLabel.mockRejectedValue(hideError);

      await expect(
        service.finalizeSection(
          makeSectionData({ isInExplodedView: false, shadow: sectionShadow })
        )
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledTimes(1);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "SectionStackUpdaterService: label sequence failed at finalizeSection",
        hideError
      );
    });
  });

  describe("update", () => {
    it("prepares the section", async () => {
      const book = makeBookData({ id: "book-1" });
      const data = makeSectionData({ books: [book] });

      await service.update({ data, pacing: StackUpdatePacings.Regular });

      expect(pieceLifecyclePort.spawnSectionShadowDomain).toHaveBeenCalledWith(
        SECTION_ID
      );
      expect(data.shadow).toBe(sectionShadow);
      expect(data.shadowNeedsReveal).toBe(true);
      expect(bookStackUpdaterPort.prepareBook).toHaveBeenCalledWith({
        data: book,
        sectionData: data,
      });
    });

    it("awaits the update sequence, after preparing the section", async () => {
      const book = makeBookData({ id: "book-1" });
      const data = makeSectionData({ books: [book] });
      const updating = makeDeferred();
      updaterAdapterPort.update.mockImplementation(() => {
        callOrder.push("update");
        return updating.promise;
      });

      const update = service.update({ data, pacing: StackUpdatePacings.Fast });
      await flush();

      expect(updaterAdapterPort.update).toHaveBeenCalledWith({
        data,
        pacing: StackUpdatePacings.Fast,
      });
      expect(callOrder).toEqual([
        "spawnSectionShadowDomain",
        "hideLabel",
        "prepareBook",
        "update",
      ]);
      expect(bookStackUpdaterPort.finalizeBook).not.toHaveBeenCalled();

      updating.resolve();
      await update;

      expect(bookStackUpdaterPort.finalizeBook).toHaveBeenCalledWith(book);
    });

    it("awaits the section finalization sequence, after the update sequence", async () => {
      const book = makeBookData({ id: "book-1" });
      const data = makeSectionData({
        isInExplodedView: true,
        books: [book],
      });
      const show = makeDeferred();
      pieceLabelServicePort.showLabel.mockImplementation(() => {
        callOrder.push("showLabel");
        return show.promise;
      });

      const update = service.update({
        data,
        pacing: StackUpdatePacings.Regular,
      });
      const state = trackSettlement(update);
      await flush();

      expect(callOrder).toEqual([
        "spawnSectionShadowDomain",
        "prepareBook",
        "update",
        "finalizeBook",
        "showLabel",
      ]);
      expect(state.settled).toBe(false);

      show.resolve();
      await update;

      expect(state.settled).toBe(true);
    });

    it("throws if the update sequence rejects", async () => {
      const error = new Error("update failed");
      updaterAdapterPort.update.mockRejectedValue(error);
      const data = makeSectionData({
        isInExplodedView: true,
        books: [makeBookData({ id: "book-1" })],
      });

      await expect(
        service.update({ data, pacing: StackUpdatePacings.Regular })
      ).rejects.toBe(error);

      expect(bookStackUpdaterPort.finalizeBook).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
    });

    it("throws if the finalization sequence rejects", async () => {
      const error = new Error("finalizeBook failed");
      bookStackUpdaterPort.finalizeBook.mockRejectedValue(error);
      const data = makeSectionData({
        isInExplodedView: true,
        books: [makeBookData({ id: "book-1" })],
      });

      await expect(
        service.update({ data, pacing: StackUpdatePacings.Regular })
      ).rejects.toBe(error);

      expect(updaterAdapterPort.update).toHaveBeenCalledTimes(1);
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
    });
  });
});
