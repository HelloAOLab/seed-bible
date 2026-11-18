import { untracked } from "@preact/signals";
import type { SeedBibleState } from "seed-bible";
import { emphasizeVerses, type BookId } from "seed-bible/managers";
import { buildPartialReveal } from "./gameLogic";
import { roundTab, trackRoundDecoration } from "./roundTab";
import type { GameSignals } from "./types";

export function revealHint(game: GameSignals) {
  const target = game.targetVerse.peek();
  if (!target?.verseText.trim()) return;
  game.partialRevealText.value = buildPartialReveal(target.verseText);
}

/**
 * Opens the answer in the round's tab, lit up with the rest of the chapter
 * dimmed until the round ends. Shared by the panel and the reader bar.
 */
export async function revealVerse(
  state: SeedBibleState,
  game: GameSignals,
  failedMessage: string
): Promise<void> {
  const target = game.targetVerse.peek();
  const tab = untracked(() => roundTab(state, game));
  if (!target || !tab) return;
  const reading = tab.readingState;
  if (state.app.selectedTab.peek()?.id !== tab.id) {
    state.app.selectTab(tab.id);
  }
  const round = game.playRound.peek();
  game.notice.value = null;
  await reading.selectTranslationAndChapter(
    reading.translationId.peek(),
    target.bookId,
    target.chapterNumber,
    { scrollToVerse: target.verseNumber }
  );
  // End game and Play both bump the round. A chapter that arrives after
  // that belongs to the round that asked for it.
  if (round !== game.playRound.peek()) return;
  const opened =
    reading.bookId.peek() === target.bookId &&
    reading.chapterNumber.peek() === target.chapterNumber;
  if (!opened || game.phase.peek() !== "playing") {
    if (game.phase.peek() === "playing") game.notice.value = failedMessage;
    return;
  }
  game.revealed.value = true;
  trackRoundDecoration(
    game,
    reading,
    emphasizeVerses(
      reading,
      {
        book: target.bookId as BookId,
        chapter: target.chapterNumber,
        verse: target.verseNumber,
      },
      undefined,
      { removeAfterMs: null, localOnly: true }
    )
  );
}
