/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { extractContentText } from "seed-bible/managers";
import { MaterialIcon } from "seed-bible/components";
import { evaluateGuess } from "./gameLogic";
import { loadGames, persistGames } from "./gamesStore";
import { GameCreator } from "./GameCreator";
import { GamePlayer } from "./GamePlayer";
import { SavedGamesList } from "./SavedGamesList";
import type { GameSignals, SavedGame } from "./types";

const PANE_ID = "find-the-verse-pane";

function GamePane({
  game,
  state,
  onSaveGame,
  onDeleteGame,
}: {
  game: GameSignals;
  state: SeedBibleState;
  onSaveGame: (saved: SavedGame) => Promise<void>;
  onDeleteGame: (id: string) => Promise<void>;
}) {
  const phase = game.phase.value;
  const savedGames = game.savedGames.value;

  if (phase === "idle") {
    return (
      <div
        style={{
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column" as const,
          gap: "24px",
          color: "var(--sb-font-color, #333)",
        }}
      >
        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "2.5rem" }}>🔍</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1.1rem" }}>
            Find the Verse
          </p>
          <p
            style={{
              margin: 0,
              opacity: 0.6,
              textAlign: "center" as const,
              fontSize: "0.9rem",
            }}
          >
            A creator picks a secret verse. Players guess where it is using
            book, chapter, and verse feedback.
          </p>
          <button
            type="button"
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              background: "var(--sb-primary-color, #4a6cf7)",
              color: "var(--sb-primary-font-color, #fff)",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
            onClick={() => {
              game.phase.value = "creating";
            }}
          >
            Create a game
          </button>
        </div>

        {/* Saved games */}
        <SavedGamesList
          games={savedGames}
          game={game}
          state={state}
          onDelete={(id) => void onDeleteGame(id)}
        />
      </div>
    );
  }

  if (phase === "creating") {
    return (
      <GameCreator
        game={game}
        state={state}
        onStart={(saved) => {
          void onSaveGame(saved).then(() => {
            // Return to idle so the user sees the saved game in the list
            game.phase.value = "idle";
            game.targetVerse.value = null;
            game.steps.value = [{ hint: "" }];
            game.selectingViaToolbar.value = false;
          });
        }}
        onCancel={() => {
          game.phase.value = "idle";
          game.targetVerse.value = null;
          game.steps.value = [{ hint: "" }];
          game.selectingViaToolbar.value = false;
        }}
      />
    );
  }

  // phase === "playing"
  return (
    <GamePlayer
      game={game}
      state={state}
      onReset={() => {
        game.phase.value = "idle";
        game.currentGameId.value = null;
        game.targetVerse.value = null;
        game.steps.value = [{ hint: "" }];
        game.guessCount.value = 0;
        game.lastResult.value = null;
        game.won.value = false;
        game.revealed.value = false;
        game.partialRevealText.value = "";
      }}
    />
  );
}

export default function initFindTheVerseExtension() {
  registerExtension({
    id: "find-the-verse-extension",
    init: function* (state: SeedBibleState) {
      const game: GameSignals = {
        phase: signal("idle"),
        currentGameId: signal(null),
        savedGames: signal([]),
        targetVerse: signal(null),
        steps: signal([{ hint: "" }]),
        selectingViaToolbar: signal(false),
        guessCount: signal(0),
        lastResult: signal(null),
        won: signal(false),
        revealed: signal(false),
        partialRevealText: signal(""),
      };

      // Load saved games whenever the user logs in (or on first mount if already logged in).
      const disposeLoadEffect = effect(() => {
        const userId = state.login.userId.value;
        if (!userId) {
          game.savedGames.value = [];
          return;
        }
        void loadGames(userId, state.os).then((games) => {
          // Guard: user may have logged out while the fetch was in flight.
          if (state.login.userId.peek() === userId) {
            game.savedGames.value = games;
          }
        });
      });

      // Persist a newly created game to the user's profile.
      async function saveGame(saved: SavedGame): Promise<void> {
        const userId = state.login.userId.peek();
        if (!userId) return;
        const next = [
          saved,
          ...game.savedGames.peek().filter((g) => g.id !== saved.id),
        ];
        game.savedGames.value = next;
        await persistGames(userId, next, state.os);
      }

      // Remove a game from the user's profile.
      async function deleteGame(id: string): Promise<void> {
        const userId = state.login.userId.peek();
        if (!userId) return;
        const next = game.savedGames.peek().filter((g) => g.id !== id);
        game.savedGames.value = next;
        await persistGames(userId, next, state.os);
      }

      // Open / re-open the pane when the toolbar button is clicked
      yield state.tools.registerToolbarTool({
        id: "find-the-verse",
        priority: 320,
        title: {
          key: "find-the-verse",
          defaultValue: "Find the Verse",
          ns: "find-the-verse-extension",
        },
        icon: () => <MaterialIcon>gps_fixed</MaterialIcon>,
        onSelect: (ctx) => {
          ctx.panesManager.openPane({
            id: PANE_ID,
            placement: "side",
            title: "Find the Verse",
            component: () => (
              <GamePane
                game={game}
                state={state}
                onSaveGame={saveGame}
                onDeleteGame={deleteGame}
              />
            ),
          });
        },
      });

      // Verse toolbar action shown only while the creator is picking a target verse.
      // The player taps a verse, the toolbar appears, and "Set as target" captures it.
      yield state.tools.registerVerseToolbarTool({
        id: "find-the-verse-set-target",
        priority: 300,
        preserveSelection: false,
        title: {
          key: "set-target",
          defaultValue: "Set as target",
          ns: "find-the-verse-extension",
        },
        icon: () => <MaterialIcon>location_on</MaterialIcon>,
        isVisible: () =>
          game.selectingViaToolbar.value && game.phase.value === "creating",
        onSelect: () => {
          const tab = state.app.selectedTab.value;
          const selected = tab?.readingState.selectedVerses.value ?? [];
          const v = selected[0];
          if (!v) return;
          game.targetVerse.value = {
            bookId: v.bookId,
            chapterNumber: v.chapterNumber,
            verseNumber: v.verse.number,
            verseText: extractContentText(v.verse.content),
          };
          game.selectingViaToolbar.value = false;
        },
      });

      // During play: intercept every verse tap, register it as a guess, and
      // immediately clear the selection so the normal toolbar never appears.
      const disposeGuessEffect = effect(() => {
        if (game.phase.value !== "playing" || game.won.value) return;

        const tab = state.app.selectedTab.value;
        if (!tab) return;

        const selected = tab.readingState.selectedVerses.value;
        const v = selected[0];
        if (!v) return;

        const target = game.targetVerse.peek();
        if (!target) return;

        const result = evaluateGuess(target, {
          bookId: v.bookId,
          chapterNumber: v.chapterNumber,
          verseNumber: v.verse.number,
        });

        game.guessCount.value = game.guessCount.peek() + 1;
        game.lastResult.value = result;
        if (result.kind === "correct") {
          game.won.value = true;
        }

        // Defer the clear one microtask to avoid re-entering this effect
        // synchronously while signals are still propagating.
        queueMicrotask(() => tab.readingState.clearSelectedVerses());
      });

      yield disposeLoadEffect;
      yield disposeGuessEffect;
    },
  });
}
