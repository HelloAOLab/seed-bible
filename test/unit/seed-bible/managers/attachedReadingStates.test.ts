import { signal } from "@preact/signals";
import {
  createAttachedReadingStates,
  type ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type {
  BibleReadingState,
  BibleSelectedVerse,
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
