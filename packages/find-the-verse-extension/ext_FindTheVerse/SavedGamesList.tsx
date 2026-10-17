import type { SeedBibleState } from "seed-bible";
import { ContextMenuItem, ContextMenuWithButton } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { bookDisplayName } from "./books";
import type { GameSignals, SavedGame } from "./types";

interface SavedGamesListProps {
  games: SavedGame[];
  game: GameSignals;
  state: SeedBibleState;
  onDelete: (id: string) => Promise<void>;
  onEdit: (saved: SavedGame) => void;
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
  onEdit,
}: SavedGamesListProps) {
  const { t } = useI18n("find-the-verse-extension");
  if (games.length === 0) return null;

  function loadGame(saved: SavedGame) {
    const reading = state.app.selectedTab.value?.readingState;
    // A verse already selected would be counted as soon as play starts.
    reading?.clearSelectedVerses();
    game.currentGameId.value = saved.id;
    game.targetVerse.value = saved.targetVerse;
    game.steps.value = saved.steps.map((step) => ({ hint: step.hint }));
    game.guessCount.value = 0;
    game.lastResult.value = null;
    game.won.value = false;
    game.revealed.value = false;
    game.partialRevealText.value = "";
    game.notice.value = null;
    game.phase.value = "playing";
    void reading?.selectChapter("GEN", 1);
  }

  const translationBooks =
    state.app.selectedTab.value?.readingState.translationBooks.value?.books;

  return (
    <div style={s.section}>
      <p style={s.heading}>
        {t("my-saved-games", { defaultValue: "My saved games" })}
      </p>
      {games.map((saved) => {
        const { bookId, chapterNumber, verseNumber } = saved.targetVerse;
        const chances = saved.steps.length;
        return (
          <div key={saved.id} style={s.card}>
            <div style={s.info}>
              <span style={s.ref}>
                {bookDisplayName(bookId, translationBooks)} {chapterNumber}:
                {verseNumber}
              </span>
              <span style={s.meta}>
                {t("chance-count", {
                  count: chances,
                  defaultValue:
                    chances === 1 ? "{{count}} chance" : "{{count}} chances",
                })}{" "}
                &middot; {formatDate(saved.createdAtMs)}
              </span>
            </div>

            <button
              type="button"
              style={s.playBtn}
              onClick={() => loadGame(saved)}
            >
              {t("play", { defaultValue: "Play" })}
            </button>

            <ContextMenuWithButton>
              <ContextMenuItem onClick={() => onEdit(saved)}>
                <span class="material-symbols-outlined sb-context-menu-item-icon">
                  edit
                </span>
                {t("edit", { defaultValue: "Edit" })}
              </ContextMenuItem>
              <ContextMenuItem
                className="sb-context-menu-item--danger"
                onClick={() => onDelete(saved.id)}
              >
                <span class="material-symbols-outlined sb-context-menu-item-icon">
                  delete
                </span>
                {t("delete", { defaultValue: "Delete" })}
              </ContextMenuItem>
            </ContextMenuWithButton>
          </div>
        );
      })}
    </div>
  );
}
