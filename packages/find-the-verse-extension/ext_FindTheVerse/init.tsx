import { batch, effect, signal, untracked } from "@preact/signals";
import { render } from "preact";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { extractContentText } from "seed-bible/managers";
import { MaterialIcon } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { isKnownBookId } from "./books";
import {
  evaluateGuess,
  openSearchWindow,
  PlayGuesses,
  tightenWindow,
} from "./gameLogic";
import { blankSteps, beginRound, resetDraft, resetPlay } from "./gameSession";
import { watchSearchRange } from "./searchRange";
import {
  createSavedGamesController,
  savedGamesErrorKey,
  savedGamesErrorMessage,
} from "./gamesStore";
import { GameCreator } from "./GameCreator";
import { GamePlayer } from "./GamePlayer";
import { FindTheVerseReaderBanner } from "./PlayBanner";
import {
  closeRoundTab,
  openRoundTab,
  roundTab,
  trackRoundDecoration,
} from "./roundTab";
import { SavedGamesList } from "./SavedGamesList";
import type { GameDraft, GameSignals, SavedGame, TargetVerse } from "./types";
import { playWinSound } from "./winSound";
import "./findTheVerse.css";

const PANE_ID = "find-the-verse-pane";
const NS = "find-the-verse-extension";
const FOUND_VERSE_CLASS = "ftv-found-verse";

interface RoundDraft {
  id: string | null;
  name: string;
  targetVerse: TargetVerse;
  steps: GameDraft["steps"];
}

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
  onStartRound,
}: {
  game: GameSignals;
  state: SeedBibleState;
  onSaveGame: (draft: GameDraft) => Promise<void>;
  onDeleteGame: (id: string) => Promise<void>;
  onEditGame: (saved: SavedGame) => void;
  onStartRound: (draft: RoundDraft) => void;
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
      <div className="ftv-home">
        <div className="ftv-home-hero">
          <span className="ftv-home-icon" aria-hidden="true">
            🔍
          </span>
          <p className="ftv-home-title">
            {t("find-the-verse", { defaultValue: "Find the Verse" })}
          </p>
          <p className="ftv-home-intro">
            {t("intro", {
              defaultValue:
                "A creator picks a secret verse. Players guess where it is using book, chapter, and verse feedback. Saved games stay on your account.",
            })}
          </p>
          <button
            type="button"
            className="ftv-btn ftv-btn--primary ftv-btn--large"
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

        {game.notice.value && <p className="ftv-notice">{game.notice.value}</p>}

        <SavedGamesList
          games={savedGames}
          state={state}
          onPlay={(saved) =>
            onStartRound({
              id: saved.id,
              name: saved.name,
              targetVerse: saved.targetVerse,
              steps: saved.steps,
            })
          }
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
          const epoch = game.draftEpoch.peek();
          game.notice.value = null;
          return onSaveGame(saved).then(
            () => game.draftEpoch.peek() === epoch,
            (error: unknown) => {
              game.notice.value = noticeFor(error, "save");
              throw error;
            }
          );
        }}
        onPlay={(draft) => {
          onStartRound({ id: game.currentGameId.peek(), ...draft });
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
        name: signal(""),
        steps: signal(blankSteps()),
        selectingViaToolbar: signal(false),
        verseLookup: signal(0),
        guessCount: signal(0),
        lastResult: signal(null),
        searchWindow: signal(openSearchWindow()),
        won: signal(false),
        revealed: signal(false),
        partialRevealText: signal(""),
        hintOpenFor: signal(null),
        playRound: signal(0),
        draftEpoch: signal(0),
        roundTabId: signal(null),
        roundDecorations: signal([]),
      };

      const savedGames = createSavedGamesController(
        game.savedGames,
        () => state.login.userId.peek(),
        state.os
      );

      // Load the list when the pane opens, and again when it is reopened.
      // The reload keeps the current user's cards on screen while it fetches.
      // A startup fetch would run for every signed-in user who has the
      // extension installed, even if they never open it.
      let paneSyncKey: string | null = null;
      const disposeLoadEffect = effect(() => {
        const userId = state.login.userId.value;
        const open = state.panes.panes.value.some(
          (pane) => pane.id === PANE_ID
        );
        if (!open) {
          paneSyncKey = null;
          if (!userId) void savedGames.syncUser(null);
          return;
        }
        const key = userId ?? "";
        if (paneSyncKey === key) return;
        paneSyncKey = key;
        const loadFailed = state.i18n.t("load-failed", {
          defaultValue: "Couldn't load your saved games.",
          ns: NS,
        });
        void savedGames.syncUser(userId).then((result) => {
          const stillOpen = state.panes.panes
            .peek()
            .some((pane) => pane.id === PANE_ID);
          if (!stillOpen || state.login.userId.peek() !== userId) return;
          if (result === "error") {
            game.notice.value = loadFailed;
          } else if (result === "ok" && game.notice.peek() === loadFailed) {
            game.notice.value = null;
          }
        });
      });

      function saveGame(draft: GameDraft): Promise<void> {
        return savedGames.save(draft, game.currentGameId.peek());
      }

      function deleteGame(id: string): Promise<void> {
        return savedGames.remove(id);
      }

      // Load a saved game into the creator for editing.
      function editGame(saved: SavedGame): void {
        game.draftEpoch.value += 1;
        game.verseLookup.value += 1;
        game.targetVerse.value = { ...saved.targetVerse };
        game.name.value = saved.name;
        game.steps.value = saved.steps.map((step) => ({ hint: step.hint }));
        game.currentGameId.value = saved.id;
        game.selectingViaToolbar.value = false;
        game.notice.value = null;
        game.phase.value = "creating";
      }

      // The tab the player was on when the round started. Closing the
      // round's tab goes back to it.
      let returnTabId: string | null = null;

      // Every round gets its own new tab. A shared session or a playing
      // playlist in the tab the player was on is left alone.
      function startRound(draft: RoundDraft) {
        batch(() => {
          const previous = game.roundTabId.peek();
          if (previous) {
            closeRoundTab(state, game, previous, null);
            game.roundTabId.value = null;
          }
          returnTabId = state.app.selectedTab.peek()?.id ?? null;
          beginRound(game, draft, openRoundTab(state));
          state.panes.closePane(PANE_ID);
        });
      }

      // The round's tab closes when the round ends. If the player closes the
      // tab first, that ends the round, the same as End game.
      const disposeRoundTab = effect(() => {
        const tabId = game.roundTabId.value;
        if (!tabId) return;
        const playing = game.phase.value === "playing";
        const open = state.tabs.tabs.value.some((tab) => tab.id === tabId);
        if (playing && open) return;
        untracked(() => {
          batch(() => {
            if (playing) resetPlay(game);
            closeRoundTab(state, game, tabId, returnTabId);
            game.roundTabId.value = null;
          });
        });
      });

      function openGamePane() {
        state.panes.openPane({
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
              onStartRound={startRound}
            />
          ),
        });
      }

      // Open / re-open the pane when the toolbar button is clicked.
      // Closing it does not end a round: on a phone the pane covers the
      // reader, so the player has to leave it to guess. The reader banner
      // stays up while the round is running.
      yield state.tools.registerToolbarTool({
        id: "find-the-verse",
        priority: 320,
        title: {
          key: "find-the-verse",
          defaultValue: "Find the Verse",
          ns: "find-the-verse-extension",
        },
        icon: () => <MaterialIcon>gps_fixed</MaterialIcon>,
        onSelect: () => {
          openGamePane();
        },
      });

      // Verse toolbar action. A reader can start a game from the verse they
      // are looking at; they do not have to open the creator first.
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
        // Hidden during a round, including the win screen. Showing it there
        // would throw that result away and open a new draft.
        isVisible: () => game.phase.value !== "playing",
        onSelect: (toolContext) => {
          const v = toolContext.readingState.selectedVerses.value[0];
          if (!v) return;
          const verseText = extractContentText(v.verse.content).trim();
          if (!isKnownBookId(v.bookId) || !verseText) {
            game.notice.value = state.i18n.t("reference-unrecognised", {
              defaultValue:
                "Couldn't recognise that reference. Try “John 1:1”.",
              ns: NS,
            });
            // The notice only renders inside the panel. On a phone the panel
            // is closed for this pick, so reopen it or the tap looks ignored.
            openGamePane();
            return;
          }
          // Already filling in a draft: keep the name and hints, only the verse
          // changes. Otherwise open a fresh creator with this verse filled in.
          const alreadyCreating = game.phase.peek() === "creating";
          if (!alreadyCreating) {
            resetPlay(game);
            game.phase.value = "creating";
          }
          game.verseLookup.value += 1;
          game.notice.value = null;
          game.targetVerse.value = {
            bookId: v.bookId,
            chapterNumber: v.chapterNumber,
            verseNumber: v.verse.number,
            verseText,
          };
          game.selectingViaToolbar.value = false;
          openGamePane();
        },
      });

      // During play: intercept every verse tap in the round's tab, register
      // it as a guess, and clear the selection so the verse toolbar never
      // appears there. Every other tab keeps its normal toolbar.
      const playGuesses = new PlayGuesses();
      const disposeGuessEffect = effect(() => {
        const playing = game.phase.value === "playing" && !game.won.value;
        if (!playing) {
          if (game.phase.value !== "playing") playGuesses.stop();
          return;
        }

        const tab = roundTab(state, game);
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

        // The clear is deferred so this effect doesn't re-enter while the
        // selection signal is still propagating.
        if (selection) {
          queueMicrotask(() => tab.readingState.clearSelectedVerses());
        }
        // Reveal already gave the answer away. Keep the verse toolbar out of
        // a round that is still on, but don't score the tap.
        if (game.revealed.value) return;

        const decision = playGuesses.observe(tab.readingState, selection);
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
          const { bookId, chapterNumber, verseNumber } = decision.guess;
          trackRoundDecoration(
            game,
            tab.readingState,
            tab.readingState.decorateVerses(
              bookId,
              chapterNumber,
              verseNumber,
              {
                className: FOUND_VERSE_CLASS,
                preserveOnChapterChange: true,
                localOnly: true,
              }
            )
          );
          // Still inside the winning tap, which is what lets audio start.
          playWinSound();
        } else {
          game.searchWindow.value = tightenWindow(
            game.searchWindow.peek(),
            decision.guess,
            result
          );
        }
      });

      yield disposeLoadEffect;
      yield disposeGuessEffect;
      yield disposeRoundTab;
      yield watchSearchRange(state, game);
      yield () => {
        state.panes.closePane(PANE_ID);
        const tabId = game.roundTabId.peek();
        if (tabId) closeRoundTab(state, game, tabId, returnTabId);
      };
      if (typeof document !== "undefined") {
        const bannerRoot = document.createElement("div");
        document.body.appendChild(bannerRoot);
        const endRound = () => {
          resetPlay(game);
          openGamePane();
        };
        render(
          <FindTheVerseReaderBanner
            game={game}
            state={state}
            paneId={PANE_ID}
            onEnd={endRound}
            onCancelSelect={() => {
              game.selectingViaToolbar.value = false;
              openGamePane();
            }}
          />,
          bannerRoot
        );
        yield () => {
          render(null, bannerRoot);
          bannerRoot.remove();
        };
      }
    },
  });
}
