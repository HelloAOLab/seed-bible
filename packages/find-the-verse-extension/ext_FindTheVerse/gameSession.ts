import type { GameSignals } from "./types";

export function resetDraft(game: GameSignals) {
  game.currentGameId.value = null;
  game.targetVerse.value = null;
  game.steps.value = [{ hint: "" }];
  game.selectingViaToolbar.value = false;
  game.notice.value = null;
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
  game.revealed.value = false;
  game.partialRevealText.value = "";
}
