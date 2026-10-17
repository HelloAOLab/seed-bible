import { effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { extractContentText } from "seed-bible/managers";
import { MaterialIcon } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { isKnownBookId } from "./books";
import { evaluateGuess, PlayGuesses } from "./gameLogic";
import { resetDraft, resetPlay } from "./gameSession";
import {
  createSavedGamesController,
  savedGamesErrorKey,
  savedGamesErrorMessage,
} from "./gamesStore";
import { GameCreator } from "./GameCreator";
import { GamePlayer } from "./GamePlayer";
import { SavedGamesList } from "./SavedGamesList";
import type { GameSignals, SavedGame } from "./types";

const PANE_ID = "find-the-verse-pane";
const NS = "find-the-verse-extension";

function FindTheVersePaneTitle() {
  const { t } = useI18n("find-the-verse-extension");
  return <>{t("find-the-verse", { defaultValue: "Find the Verse" })}</>;
}

function GamePane({
  game,
  state,
  onSaveGame,
  onDeleteGame,
  onEditGame,
}: {
  game: GameSignals;
  state: SeedBibleState;
  onSaveGame: (saved: SavedGame) => Promise<void>;
  onDeleteGame: (id: string) => Promise<void>;
  onEditGame: (saved: SavedGame) => void;
}) {
  const phase = game.phase.value;
  const savedGames = game.savedGames.value;
  const { t } = useI18n("find-the-verse-extension");
  const noticeFor = (error: unknown, action: "save" | "delete") =>
    t(savedGamesErrorKey(error, action), {
      defaultValue: savedGamesErrorMessage(error, action),
    });

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
            {t("find-the-verse", { defaultValue: "Find the Verse" })}
          </p>
          <p
            style={{
              margin: 0,
              opacity: 0.6,
              textAlign: "center" as const,
              fontSize: "0.9rem",
            }}
          >
            {t("intro", {
              defaultValue:
                "A creator picks a secret verse. Players guess where it is using book, chapter, and verse feedback. Saved games stay on your account.",
            })}
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
              // A leftover id from Edit would make the next Save overwrite
              // that game. Start from a blank draft.
              resetDraft(game);
              game.phase.value = "creating";
            }}
          >
            {t("create-game", { defaultValue: "Create a game" })}
          </button>
        </div>

        {game.notice.value && (
          <p
            style={{
              margin: 0,
              color: "#e63946",
              fontSize: "0.9rem",
            }}
          >
            {game.notice.value}
          </p>
        )}

        {/* Saved games */}
        <SavedGamesList
          games={savedGames}
          game={game}
          state={state}
          onDelete={(id) => {
            game.notice.value = null;
            return onDeleteGame(id).catch((error: unknown) => {
              game.notice.value = noticeFor(error, "delete");
            });
          }}
          onEdit={onEditGame}
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
          game.notice.value = null;
          return onSaveGame(saved).then(
            () => {
              resetDraft(game);
              game.phase.value = "idle";
            },
            (error: unknown) => {
              game.notice.value = noticeFor(error, "save");
            }
          );
        }}
        onCancel={() => {
          resetDraft(game);
          game.phase.value = "idle";
        }}
      />
    );
  }

  // phase === "playing"
  return (
    <GamePlayer game={game} state={state} onReset={() => resetPlay(game)} />
  );
}

export default function initFindTheVerseExtension() {
  registerExtension({
    id: "find-the-verse-extension",
    init: function* (state: SeedBibleState) {
      const game: GameSignals = {
        phase: signal("idle"),
        currentGameId: signal(null),
        notice: signal(null),
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

      const savedGames = createSavedGamesController(
        game.savedGames,
        () => state.login.userId.peek(),
        state.os
      );

      // Load saved games whenever the user logs in (or on first mount if already logged in).
      const disposeLoadEffect = effect(() => {
        const userId = state.login.userId.value;
        game.notice.value = null;
        void savedGames.syncUser(userId).then((result) => {
          if (result === "error" && state.login.userId.peek() === userId) {
            game.notice.value = state.i18n.t("load-failed", {
              defaultValue: "Couldn't load your saved games.",
              ns: NS,
            });
          }
        });
      });

      function saveGame(saved: SavedGame): Promise<void> {
        return savedGames.save(saved);
      }

      function deleteGame(id: string): Promise<void> {
        return savedGames.remove(id);
      }

      // Load a saved game into the creator for editing.
      function editGame(saved: SavedGame): void {
        game.targetVerse.value = { ...saved.targetVerse };
        game.steps.value = saved.steps.map((step) => ({ hint: step.hint }));
        game.currentGameId.value = saved.id;
        game.selectingViaToolbar.value = false;
        game.notice.value = null;
        game.phase.value = "creating";
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
            title: () => <FindTheVersePaneTitle />,
            component: () => (
              <GamePane
                game={game}
                state={state}
                onSaveGame={saveGame}
                onDeleteGame={deleteGame}
                onEditGame={editGame}
              />
            ),
            onClose: () => {
              // Verse taps stay guesses for as long as phase is "playing",
              // including after this pane is gone.
              if (game.phase.peek() === "playing") {
                resetPlay(game);
                return;
              }
              game.selectingViaToolbar.value = false;
            },
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
          const verseText = extractContentText(v.verse.content).trim();
          if (!isKnownBookId(v.bookId) || !verseText) {
            game.notice.value = state.i18n.t("reference-unrecognised", {
              defaultValue:
                "Couldn't recognise that reference. Try “John 1:1”.",
              ns: NS,
            });
            return;
          }
          game.notice.value = null;
          game.targetVerse.value = {
            bookId: v.bookId,
            chapterNumber: v.chapterNumber,
            verseNumber: v.verse.number,
            verseText,
          };
          game.selectingViaToolbar.value = false;
        },
      });

      // During play: intercept every verse tap, register it as a guess, and
      // immediately clear the selection so the normal toolbar never appears.
      const playGuesses = new PlayGuesses();
      const disposeGuessEffect = effect(() => {
        const playing = game.phase.value === "playing" && !game.won.value;
        if (!playing) {
          if (game.phase.value !== "playing") playGuesses.stop();
          return;
        }

        const tab = state.app.selectedTab.value;
        if (!tab) return;

        const selected = tab.readingState.selectedVerses.value;
        const verse = selected[0];
        const selection = verse
          ? {
              bookId: verse.bookId,
              chapterNumber: verse.chapterNumber,
              verseNumber: verse.verse.number,
            }
          : null;

        const decision = playGuesses.observe(tab.readingState, selection);
        // The clear is deferred so this effect doesn't re-enter while the
        // selection signal is still propagating.
        if (selection) {
          queueMicrotask(() => tab.readingState.clearSelectedVerses());
        }
        if (!decision) return;

        const target = game.targetVerse.peek();
        if (!target) return;

        const result = evaluateGuess(target, decision.guess);
        if (decision.spendChance) {
          game.guessCount.value = game.guessCount.peek() + 1;
        }
        game.lastResult.value = result;
        if (result.kind === "correct") {
          game.won.value = true;
        }
      });

      yield disposeLoadEffect;
      yield disposeGuessEffect;
    },
  });
}
