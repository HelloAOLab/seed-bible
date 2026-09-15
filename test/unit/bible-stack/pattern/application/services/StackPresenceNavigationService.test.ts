import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { StackPresenceNavigationService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackPresenceNavigationService";
import { SequenceStateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SequenceStateService";
import { BaseEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BaseEventManager";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";
import type {
  ReadingInstance,
  UserPresence,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/userPresence";

describe("application.services.StackPresenceNavigationService", () => {
  let eventBus: BaseEventManager<BibleStackEvents>;
  let sequenceStateService: SequenceStateService;
  let selectedInstance: ReadingInstance;
  let getOwnUserSelectedInstance: Mock<() => ReadingInstance>;
  let releaseSleep: (() => void) | undefined;
  let sleep: Mock<(ms: number) => Promise<void>>;
  let trySelectChapter: Mock<(params: unknown) => Promise<void>>;
  let chapters: unknown[];

  const instance = (bookId: string, chapter: number): ReadingInstance => ({
    bookId,
    chapter,
    id: `${bookId}-${chapter}`,
    selected: true,
    translation: "BSB",
    connectionId: "c1",
  });

  const chapter = (bookId: string, number: number) => ({
    id: `${bookId}-${number}-chapter`,
    piece: {},
    isSelected: false,
    isOnTheGround: false,
    isActive: false,
    parentDataIds: {},
    getCreationParam: (param: string) => (param === "bookId" ? bookId : ""),
    getPieceInfoProperty: (property: string) =>
      property === "number" ? number : "",
    getParentId: (key: string) =>
      key === "stackBibleId" ? "stack-bible-1" : undefined,
  });

  /** Holds the update open until `releaseSleep()` is called. */
  function holdUpdate() {
    sleep.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseSleep = resolve;
        })
    );
  }

  const emitPresence = () =>
    eventBus.emit("OnUserPresenceUpdated", {
      userPresence: new Map() as UserPresence,
    });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  function createService() {
    getOwnUserSelectedInstance = vi.fn<() => ReadingInstance>(
      () => selectedInstance
    );
    sleep = vi.fn<(ms: number) => Promise<void>>(() => Promise.resolve());
    trySelectChapter = vi.fn<(params: unknown) => Promise<void>>(() =>
      Promise.resolve()
    );

    return new StackPresenceNavigationService({
      loggerPort: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      bibleDataRepositoryPort: {
        getAllBiblesData: vi.fn(() => [{}]),
      },
      userPresencePort: { getOwnUserSelectedInstance },
      pieceAdapterPort: { isPieceBeingUsed: vi.fn(() => true) },
      pieceDataRepositoryPort: {
        getAllChapters: vi.fn(() => chapters),
        getAllBooks: vi.fn(() => []),
        getAllSectionBooks: vi.fn(() => []),
      },
      sequenceStateServicePort: sequenceStateService,
      eventBus,
      chapterSelectionServicePort: {
        trySelectChapter,
        deselectChapter: vi.fn(),
      },
      pieceHierarchyServicePort: { getParentDataChain: vi.fn(() => ({})) },
      scriptureServicePort: { mapSubsetToCompleteBook: vi.fn() },
      bibleSequenceServicePort: { resetBible: vi.fn() },
      bookSelectionServicePort: { selectBook: vi.fn(), deselectBook: vi.fn() },
      awaiterPort: { sleep: (ms: number) => sleep(ms) },
      testamentSelectionServicePort: { select: vi.fn() },
      sectionSelectionServicePort: { select: vi.fn() },
      explodedViewServicePort: { explodeSection: vi.fn() },
      arrangementServicePort: {
        getBookInfoPathById: vi.fn(() => ({
          found: true,
          arrangementIndex: 0,
          testamentIndex: 0,
          sectionIndex: 0,
          bookIndex: 0,
        })),
        getBookByIndices: vi.fn(() => ({ type: "complete" })),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  beforeEach(() => {
    eventBus = new BaseEventManager<BibleStackEvents>();
    sequenceStateService = new SequenceStateService({
      sequenceEventPort: eventBus,
    });
    selectedInstance = instance("GEN", 1);
    releaseSleep = undefined;
    chapters = [];
    createService();
  });

  it("syncs to the latest position when a second update arrives mid-sequence", async () => {
    holdUpdate();

    emitPresence();
    await flush();

    expect(getOwnUserSelectedInstance).toHaveBeenCalledTimes(1);

    selectedInstance = instance("EXO", 25);
    emitPresence();
    await flush();

    sleep.mockImplementation(() => Promise.resolve());
    releaseSleep?.();
    await flush();

    expect(getOwnUserSelectedInstance).toHaveBeenCalledTimes(2);
    expect(getOwnUserSelectedInstance.mock.results[1]?.value).toEqual(
      instance("EXO", 25)
    );
  });

  it("abandons an in-flight navigation when a newer position arrives", async () => {
    chapters = [chapter("GEN", 1)];
    holdUpdate();

    emitPresence();
    await flush();

    selectedInstance = instance("EXO", 25);
    emitPresence();

    sleep.mockImplementation(() => Promise.resolve());
    releaseSleep?.();
    await flush();

    const focusedStaleChapter = trySelectChapter.mock.calls.some(
      (call) =>
        (call[0] as { data?: { id?: string } }).data?.id === "GEN-1-chapter"
    );
    expect(focusedStaleChapter).toBe(false);
  });

  it("discards a position that arrived during someone else's sequence", async () => {
    let releaseForeign: (() => void) | undefined;
    sequenceStateService.executeAsSequence(
      () =>
        new Promise<void>((resolve) => {
          releaseForeign = resolve;
        })
    );

    emitPresence();
    await flush();

    expect(getOwnUserSelectedInstance).not.toHaveBeenCalled();

    releaseForeign?.();
    await flush();

    expect(getOwnUserSelectedInstance).not.toHaveBeenCalled();
  });

  it("does not re-run when no further update arrived", async () => {
    holdUpdate();

    emitPresence();
    await flush();

    sleep.mockImplementation(() => Promise.resolve());
    releaseSleep?.();
    await flush();

    expect(getOwnUserSelectedInstance).toHaveBeenCalledTimes(1);
  });
});
