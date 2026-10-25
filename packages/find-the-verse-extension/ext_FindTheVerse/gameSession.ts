import { openSearchWindow } from "./gameLogic";
import type { GameSignals, GameStep, TargetVerse } from "./types";

/** A starting suggestion. Creators can remove rows or add more before saving. */
export const SUGGESTED_CHANCES = 7;

export function blankSteps(): GameStep[] {
  return Array.from({ length: SUGGESTED_CHANCES }, () => ({ hint: "" }));
}

export function resetDraft(game: GameSignals) {
  game.draftEpoch.value += 1;
  game.currentGameId.value = null;
  game.targetVerse.value = null;
  game.name.value = "";
  game.steps.value = blankSteps();
  game.selectingViaToolbar.value = false;
  game.notice.value = null;
  game.verseLookup.value += 1;
}

/**
 * Ends the round and the draft together. The guess effect treats every verse
 * tap as a guess while `phase` is `"playing"`, including after the pane closes.
 */
export function resetPlay(game: GameSignals) {
  resetDraft(game);
  game.phase.value = "idle";
  game.guessCount.value = 0;
  game.lastResult.value = null;
  game.won.value = false;
  game.searchWindow.value = openSearchWindow();
  game.revealed.value = false;
  game.partialRevealText.value = "";
  game.hintOpenFor.value = null;
  game.playRound.value += 1;
}

/**
 * Starts a round from a draft or a saved game. `resetPlay` runs first so a
 * guess already sitting in the reader is not scored, and so a save that is
 * still finishing does not clear this round when it completes.
 */
export function beginRound(
  game: GameSignals,
  draft: {
    id: string | null;
    name: string;
    targetVerse: TargetVerse;
    steps: readonly GameStep[];
  },
  reading:
    | {
        clearSelectedVerses: () => void;
        selectChapter: (bookId: string, chapter: number) => unknown;
      }
    | null
    | undefined
) {
  reading?.clearSelectedVerses();
  resetPlay(game);
  game.currentGameId.value = draft.id;
  game.name.value = draft.name;
  game.targetVerse.value = draft.targetVerse;
  game.steps.value = draft.steps.map((step) => ({ hint: step.hint }));
  game.phase.value = "playing";
  void reading?.selectChapter("GEN", 1);
}
