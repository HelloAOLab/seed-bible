import { signal } from "@preact/signals";
import { describe, expect, it } from "vitest";
import { resetPlay } from "@packages/find-the-verse-extension/ext_FindTheVerse/gameSession";
import type { GameSignals } from "@packages/find-the-verse-extension/ext_FindTheVerse/types";

function playingGame(): GameSignals {
  return {
    phase: signal("playing"),
    currentGameId: signal("game-1"),
    notice: signal("Couldn't open that verse."),
    savedGames: signal([]),
    targetVerse: signal({
      bookId: "JHN",
      chapterNumber: 1,
      verseNumber: 1,
      verseText: "In the beginning",
    }),
    steps: signal([{ hint: "a" }, { hint: "b" }]),
    selectingViaToolbar: signal(true),
    verseLookup: signal(0),
    guessCount: signal(2),
    lastResult: signal({ kind: "wrong_book", direction: "after" }),
    won: signal(false),
    revealed: signal(true),
    partialRevealText: signal("In ___"),
  };
}

describe("resetPlay", () => {
  it("ends the round so a closed panel stops taking verse taps", () => {
    const game = playingGame();

    resetPlay(game);

    expect(game.phase.value).toBe("idle");
    expect(game.guessCount.value).toBe(0);
    expect(game.lastResult.value).toBeNull();
    expect(game.won.value).toBe(false);
    expect(game.revealed.value).toBe(false);
    expect(game.partialRevealText.value).toBe("");
    expect(game.currentGameId.value).toBeNull();
    expect(game.targetVerse.value).toBeNull();
    expect(game.selectingViaToolbar.value).toBe(false);
    expect(game.notice.value).toBeNull();
    expect(game.steps.value).toEqual([{ hint: "" }]);
    expect(game.savedGames.value).toEqual([]);
  });
});
