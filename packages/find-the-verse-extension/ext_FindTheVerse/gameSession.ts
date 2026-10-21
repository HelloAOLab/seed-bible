import { openSearchWindow } from "./gameLogic";
import type { GameSignals, GameStep } from "./types";

/** A starting suggestion. Creators can remove rows or add more before saving. */
export const SUGGESTED_CHANCES = 7;

export function blankSteps(): GameStep[] {
  return Array.from({ length: SUGGESTED_CHANCES }, () => ({ hint: "" }));
}

export function resetDraft(game: GameSignals) {
  game.currentGameId.value = null;
  game.targetVerse.value = null;
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
