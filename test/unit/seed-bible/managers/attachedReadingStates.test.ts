import { signal } from "@preact/signals";
import {
  createAttachedReadingStates,
  type ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type {
  BibleReadingState,
  BibleSelectedVerse,
  VerseDecoration,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";

/** Just the selection a reading state keeps, which is what this tracks. */
function readingState(): BibleReadingState {
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  return {
    selectedVerses,
    clearSelectedVerses: () => {
      selectedVerses.value = [];
    },
  } as unknown as BibleReadingState;
}

const select = (state: BibleReadingState, verse: number) => {
  (state.selectedVerses as { value: BibleSelectedVerse[] }).value = [
    ...state.selectedVerses.peek(),
    {
      bookId: "GEN",
      chapterNumber: 1,
      verse: { type: "verse", number: verse, content: [] },
    } as unknown as BibleSelectedVerse,
  ];
};

function setup() {
  const tab = { id: "tab-1", readingState: readingState() } as ReaderTab;
  const second = readingState();
  const attached = createAttachedReadingStates();
  const detach = attached.attachReadingState(tab, second);
  return { tab, second, detach, ...attached };
}

describe("reading states shown beside a tab's own", () => {
  it("leaves the tab's own as the active one until the other is used", () => {
    const { tab, activeReadingState } = setup();

    expect(activeReadingState(tab)).toBe(tab.readingState);
  });

  it("makes the other active when verses are selected in it, clearing the tab's selection", () => {
    const { tab, second, activeReadingState } = setup();
    select(tab.readingState, 1);

    select(second, 2);

    expect(activeReadingState(tab)).toBe(second);
    expect(tab.readingState.selectedVerses.value).toEqual([]);
    expect(second.selectedVerses.value).toHaveLength(1);
  });

  it("hands back to the tab's own when verses are selected there", () => {
    const { tab, second, activeReadingState } = setup();
    select(second, 2);
    select(second, 3);

    select(tab.readingState, 1);

    expect(activeReadingState(tab)).toBe(tab.readingState);
    expect(second.selectedVerses.value).toEqual([]);
    expect(tab.readingState.selectedVerses.value).toHaveLength(1);
  });

  it("can be pointed at either without a selection, as opening a footnote does", () => {
    const { tab, second, activeReadingState, focusReadingState } = setup();

    focusReadingState(tab, second);
    expect(activeReadingState(tab)).toBe(second);

    focusReadingState(tab, tab.readingState);
    expect(activeReadingState(tab)).toBe(tab.readingState);
  });

  it("forgets the other once it's no longer shown", () => {
    const { tab, second, detach, activeReadingState } = setup();
    select(second, 2);

    detach();

    expect(activeReadingState(tab)).toBe(tab.readingState);
    // Nor does selecting in either keep clearing the other.
    select(tab.readingState, 1);
    expect(second.selectedVerses.value).toHaveLength(1);
  });

  it("only affects the tab it's shown in", () => {
    const { second, activeReadingState } = setup();
    const otherTab = { id: "tab-2", readingState: readingState() } as ReaderTab;
    select(second, 2);

    expect(activeReadingState(otherTab)).toBe(otherTab.readingState);
  });
});

describe("highlights in a reader beside a shared session's tab", () => {
  /** A reader's position and decorations, which is what's shared. */
  function decoratedReadingState(bookId: string, chapterNumber: number) {
    const decorations = signal<VerseDecoration[]>([]);
    return {
      bookId: signal(bookId),
      chapterNumber: signal(chapterNumber),
      selectedVerses: signal<BibleSelectedVerse[]>([]),
      clearSelectedVerses: () => {},
      decorations,
      decorateVerses: (
        book: string,
        chapter: number,
        verses: number | number[],
        input: Record<string, unknown>,
        id: string
      ) => {
        const next = {
          id,
          bookId: book,
          chapterNumber: chapter,
          verses: Array.isArray(verses) ? verses : [verses],
          ...input,
        } as VerseDecoration;
        decorations.value = [
          ...decorations.peek().filter((d) => d.id !== id),
          next,
        ];
        return id;
      },
      removeDecoration: (id: string) => {
        decorations.value = decorations.peek().filter((d) => d.id !== id);
      },
    } as unknown as BibleReadingState;
  }

  const highlight = (
    state: BibleReadingState,
    id: string,
    bookId: string,
    chapter: number,
    extra: Record<string, unknown> = {}
  ) =>
    state.decorateVerses(
      bookId,
      chapter,
      [16],
      { className: "sb-verse-decoration-highlight", ...extra },
      id
    );
  const ids = (state: BibleReadingState) =>
    state.decorations.value.map((d) => d.id);

  // A compare step: the tab shows Exodus 3, the reader beside it John 10.
  function setupShared(shared = true) {
    const tab = {
      id: "tab-1",
      readingState: decoratedReadingState("EXO", 3),
      sharedSession: shared ? ({ id: "group-abc" } as never) : null,
    } as unknown as ReaderTab;
    const beside = decoratedReadingState("JHN", 10);
    const attached = createAttachedReadingStates();
    const detach = attached.attachReadingState(tab, beside);
    return { own: tab.readingState, beside, detach };
  }

  it("puts a highlight made beside into the tab's own, which the session shares, and takes it back out", () => {
    const { own, beside } = setupShared();

    highlight(beside, "h1", "JHN", 10);
    expect(ids(own)).toEqual(["h1"]);
    expect(own.decorations.value[0]).toMatchObject({
      bookId: "JHN",
      chapterNumber: 10,
      verses: [16],
    });

    beside.removeDecoration("h1");
    expect(ids(own)).toEqual([]);
  });

  it("shows beside a highlight that arrives for its chapter, and drops it when it goes", () => {
    const { own, beside } = setupShared();

    // From a peer, through the session, into the tab's own.
    highlight(own, "peer", "JHN", 10);
    highlight(own, "peer-exodus", "EXO", 3);
    expect(ids(beside)).toEqual(["peer"]);

    own.removeDecoration("peer");
    expect(ids(beside)).toEqual([]);
    expect(ids(own)).toEqual(["peer-exodus"]);
  });

  it("keeps the tab's own highlights when the reader beside drops other chapters' as it loads", () => {
    const { own, beside } = setupShared();
    highlight(own, "exodus", "EXO", 3);

    // A reader clears decorations for other chapters when it moves.
    (beside.decorations as { value: VerseDecoration[] }).value = [];

    expect(ids(own)).toEqual(["exodus"]);
  });

  it("leaves a highlight kept to this device where it is", () => {
    const { own, beside } = setupShared();

    highlight(beside, "mine", "JHN", 10, { localOnly: true });

    expect(ids(own)).toEqual([]);
  });

  it("shares nothing outside a session, or once the reader beside is gone", () => {
    const unshared = setupShared(false);
    highlight(unshared.beside, "h1", "JHN", 10);
    expect(ids(unshared.own)).toEqual([]);

    const shared = setupShared();
    shared.detach();
    highlight(shared.beside, "h2", "JHN", 10);
    expect(ids(shared.own)).toEqual([]);
  });
});
