import { signal } from "@preact/signals";
import { describe, expect, it } from "vitest";
import { openSearchWindow } from "@packages/find-the-verse-extension/ext_FindTheVerse/gameLogic";
import {
  beginRound,
  blankSteps,
  resetPlay,
} from "@packages/find-the-verse-extension/ext_FindTheVerse/gameSession";
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
    name: signal("Youth group"),
    steps: signal([{ hint: "a" }, { hint: "b" }]),
    selectingViaToolbar: signal(true),
    verseLookup: signal(0),
    guessCount: signal(2),
    lastResult: signal({ kind: "wrong_book", direction: "after" }),
    searchWindow: signal({
      after: { bookIndex: 0, chapterNumber: 3, verseNumber: 10 },
      before: null,
    }),
    won: signal(false),
    revealed: signal(true),
    partialRevealText: signal("In ___"),
    hintOpenFor: signal(0),
    playRound: signal(3),
    draftEpoch: signal(0),
    roundTabId: signal("tab-2"),
    roundDecorations: signal([]),
  };
}

describe("beginRound", () => {
  it("starts a fresh round tied to the tab it is played in", () => {
    const game = playingGame();

    beginRound(
      game,
      {
        id: "game-2",
        name: "Evening",
        targetVerse: {
          bookId: "ROM",
          chapterNumber: 8,
          verseNumber: 28,
          verseText: "And we know",
        },
        steps: [{ hint: "x" }, { hint: "y" }, { hint: "z" }],
      },
      "tab-7"
    );

    expect(game.phase.value).toBe("playing");
    expect(game.roundTabId.value).toBe("tab-7");
    expect(game.currentGameId.value).toBe("game-2");
    expect(game.targetVerse.value?.bookId).toBe("ROM");
    expect(game.guessCount.value).toBe(0);
    expect(game.revealed.value).toBe(false);
  });
});

describe("resetPlay", () => {
  it("ends the round so a closed panel stops taking verse taps", () => {
    const game = playingGame();

    resetPlay(game);

    expect(game.phase.value).toBe("idle");
    expect(game.guessCount.value).toBe(0);
    expect(game.lastResult.value).toBeNull();
    expect(game.searchWindow.value).toEqual(openSearchWindow());
    expect(game.won.value).toBe(false);
    expect(game.revealed.value).toBe(false);
    expect(game.partialRevealText.value).toBe("");
    expect(game.hintOpenFor.value).toBeNull();
    expect(game.playRound.value).toBe(4);
    expect(game.draftEpoch.value).toBe(1);
    expect(game.currentGameId.value).toBeNull();
    expect(game.targetVerse.value).toBeNull();
    expect(game.name.value).toBe("");
    expect(game.selectingViaToolbar.value).toBe(false);
    expect(game.notice.value).toBeNull();
    expect(game.steps.value).toEqual(blankSteps());
    expect(game.steps.value).toHaveLength(7);
    expect(game.savedGames.value).toEqual([]);
  });
});
