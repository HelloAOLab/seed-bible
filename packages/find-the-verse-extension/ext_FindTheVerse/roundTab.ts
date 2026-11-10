import { batch } from "@preact/signals";
import type { SeedBibleState } from "seed-bible";
import type { BibleReadingState } from "seed-bible/managers";
import type { GameSignals } from "./types";

type ReaderTab = NonNullable<SeedBibleState["app"]["selectedTab"]["value"]>;

/** The round's tab, or null when no round is on or the player closed it. */
export function roundTab(
  state: SeedBibleState,
  game: GameSignals
): ReaderTab | null {
  const id = game.roundTabId.value;
  if (!id) return null;
  return state.tabs.tabs.value.find((tab) => tab.id === id) ?? null;
}

export function roundReading(
  state: SeedBibleState,
  game: GameSignals
): BibleReadingState | null {
  return roundTab(state, game)?.readingState ?? null;
}

export function isRoundTabSelected(
  state: SeedBibleState,
  game: GameSignals
): boolean {
  const id = game.roundTabId.value;
  return !!id && state.app.selectedTab.value?.id === id;
}

/**
 * Opens a fresh tab on Genesis 1 for a round and selects it. It is never a
 * shared session, so nothing the round does reaches other people.
 */
export function openRoundTab(state: SeedBibleState): string {
  const from = state.app.selectedTab.peek()?.readingState;
  const tab = state.tabs.addTab(undefined, {
    initialTranslationId: from?.translationId.peek() ?? null,
    initialBookId: "GEN",
    initialChapterNumber: 1,
  });
  state.app.selectTab(tab.id);
  return tab.id;
}

export function trackRoundDecoration(
  game: GameSignals,
  reading: BibleReadingState,
  id: string | null
) {
  if (!id) return;
  game.roundDecorations.value = [
    ...game.roundDecorations.peek(),
    { reading, id },
  ];
}

export function clearRoundDecorations(game: GameSignals) {
  const marks = game.roundDecorations.peek();
  if (marks.length === 0) return;
  for (const mark of marks) mark.reading.removeDecoration(mark.id);
  game.roundDecorations.value = [];
}

/**
 * Takes the round's marks off and closes its tab. The last tab stays open, so
 * the reader is never left without one. `returnTo` is the tab the player
 * started from; it is selected again if the round's tab was on screen.
 */
export function closeRoundTab(
  state: SeedBibleState,
  game: GameSignals,
  tabId: string,
  returnTo: string | null
) {
  batch(() => {
    clearRoundDecorations(game);
    const tabs = state.tabs.tabs.peek();
    if (!tabs.some((tab) => tab.id === tabId) || tabs.length <= 1) return;
    const wasSelected = state.app.selectedTab.peek()?.id === tabId;
    state.tabs.removeTab(tabId);
    if (
      wasSelected &&
      returnTo &&
      state.tabs.tabs.peek().some((tab) => tab.id === returnTo)
    ) {
      state.app.selectTab(returnTo);
    }
  });
}
