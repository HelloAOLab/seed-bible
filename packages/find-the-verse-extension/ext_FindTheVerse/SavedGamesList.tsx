/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import type { SeedBibleState } from "seed-bible";
import { bookDisplayName } from "./books";
import type { GameSignals, SavedGame } from "./types";

interface SavedGamesListProps {
  games: SavedGame[];
  game: GameSignals;
  state: SeedBibleState;
  onDelete: (id: string) => void;
}

const s = {
  section: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "8px",
  },
  heading: {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    opacity: 0.5,
    margin: 0,
  },
  card: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "var(--sb-secondary-background, #f5f5f5)",
    display: "flex" as const,
    gap: "10px",
    alignItems: "center" as const,
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "2px",
  },
  ref: {
    fontWeight: 600,
    fontSize: "0.9rem",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  meta: {
    fontSize: "0.75rem",
    opacity: 0.55,
  },
  playBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    background: "var(--sb-primary-color, #4a6cf7)",
    color: "var(--sb-primary-font-color, #fff)",
    flexShrink: 0,
  },
  deleteBtn: {
    padding: "4px 6px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    background: "none",
    color: "var(--sb-danger-color, #e63946)",
    flexShrink: 0,
    opacity: 0.7,
  },
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SavedGamesList({
  games,
  game,
  state,
  onDelete,
}: SavedGamesListProps) {
  if (games.length === 0) return null;

  function loadGame(saved: SavedGame) {
    game.currentGameId.value = saved.id;
    game.targetVerse.value = saved.targetVerse;
    game.steps.value = saved.steps;
    game.guessCount.value = 0;
    game.lastResult.value = null;
    game.won.value = false;
    game.revealed.value = false;
    game.partialRevealText.value = "";
    game.phase.value = "playing";
    void state.app.selectedTab.value?.readingState.selectChapter("GEN", 1);
  }

  return (
    <div style={s.section}>
      <p style={s.heading}>My saved games</p>
      {games.map((saved) => {
        const { bookId, chapterNumber, verseNumber } = saved.targetVerse;
        const chances = saved.steps.length;
        return (
          <div key={saved.id} style={s.card}>
            <div style={s.info}>
              <span style={s.ref}>
                {bookDisplayName(bookId)} {chapterNumber}:{verseNumber}
              </span>
              <span style={s.meta}>
                {chances} {chances === 1 ? "chance" : "chances"} &middot;{" "}
                {formatDate(saved.createdAtMs)}
              </span>
            </div>
            <button
              type="button"
              style={s.playBtn}
              onClick={() => loadGame(saved)}
            >
              Play
            </button>
            <button
              type="button"
              style={s.deleteBtn}
              title="Delete game"
              onClick={() => onDelete(saved.id)}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
