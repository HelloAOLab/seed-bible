import type { SeedBibleState } from "seed-bible";
import { useSignal } from "@preact/signals";
import { ContextMenuItem, ContextMenuWithButton } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { formatReference } from "./books";
import { beginRound } from "./gameSession";
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
    background: "var(--sb-tertiary-color, #f0f0f0)",
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
  quietBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    background: "transparent",
    color: "var(--sb-font-color, #333)",
    flexShrink: 0,
  },
  revealRef: {
    padding: 0,
    border: "none",
    background: "transparent",
    color: "var(--sb-font-color, #333)",
    fontWeight: 600,
    fontSize: "0.9rem",
    textAlign: "left" as const,
    cursor: "pointer",
  },
  revealLink: {
    padding: 0,
    border: "none",
    background: "transparent",
    color: "var(--sb-font-color, #333)",
    fontWeight: 500,
    fontSize: "0.8rem",
    opacity: 0.7,
    textAlign: "left" as const,
    cursor: "pointer",
    width: "fit-content",
  },
};

function SavedGameCard({
  saved,
  translationBooks,
  confirming,
  onPlay,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  saved: SavedGame;
  translationBooks:
    | { id: string; name?: string; commonName?: string }[]
    | undefined;
  confirming: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const { t } = useI18n("find-the-verse-extension");
  const referenceShown = useSignal(false);
  const { bookId, chapterNumber, verseNumber } = saved.targetVerse;
  const chances = saved.steps.length;
  const reference = formatReference(
    bookId,
    chapterNumber,
    verseNumber,
    translationBooks
  );
  const gameName = saved.name.trim();

  return (
    <div style={s.card}>
      <div style={s.info}>
        {referenceShown.value ? (
          <span style={s.ref}>{reference}</span>
        ) : gameName ? (
          <>
            <span style={s.ref}>{gameName}</span>
            <button
              type="button"
              style={s.revealLink}
              onClick={() => {
                referenceShown.value = true;
              }}
            >
              {t("show-reference", { defaultValue: "Show reference" })}
            </button>
          </>
        ) : (
          <button
            type="button"
            style={s.revealRef}
            onClick={() => {
              referenceShown.value = true;
            }}
          >
            {t("show-reference", { defaultValue: "Show reference" })}
          </button>
        )}
        <span style={s.meta}>
          {t("saved-game", { defaultValue: "Saved game" })}
          {" · "}
          {t("chance-count", {
            count: chances,
            defaultValue:
              chances === 1 ? "{{count}} chance" : "{{count}} chances",
          })}{" "}
          &middot; {formatDate(saved.createdAtMs)}
        </span>
        {confirming && (
          <span style={s.meta}>
            {t("delete-confirm", { defaultValue: "Delete this game?" })}
          </span>
        )}
      </div>

      {confirming ? (
        <>
          <button type="button" style={s.playBtn} onClick={onConfirmDelete}>
            {t("delete", { defaultValue: "Delete" })}
          </button>
          <button type="button" style={s.quietBtn} onClick={onCancelDelete}>
            {t("cancel", { defaultValue: "Cancel" })}
          </button>
        </>
      ) : (
        <>
          <button type="button" style={s.playBtn} onClick={onPlay}>
            {t("play", { defaultValue: "Play" })}
          </button>
          <ContextMenuWithButton>
            <ContextMenuItem onClick={onEdit}>
              <span class="material-symbols-outlined sb-context-menu-item-icon">
                edit
              </span>
              {t("edit", { defaultValue: "Edit" })}
            </ContextMenuItem>
            <ContextMenuItem
              className="sb-context-menu-item--danger"
              onClick={onAskDelete}
            >
              <span class="material-symbols-outlined sb-context-menu-item-icon">
                delete
              </span>
              {t("delete", { defaultValue: "Delete" })}
            </ContextMenuItem>
          </ContextMenuWithButton>
        </>
      )}
    </div>
  );
}

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
  const confirmingId = useSignal<string | null>(null);
  if (games.length === 0) return null;

  function loadGame(saved: SavedGame) {
    beginRound(
      game,
      {
        id: saved.id,
        name: saved.name,
        targetVerse: saved.targetVerse,
        steps: saved.steps,
      },
      state.app.selectedTab.value?.readingState
    );
  }

  const translationBooks =
    state.app.selectedTab.value?.readingState.translationBooks.value?.books;

  return (
    <div style={s.section}>
      <p style={s.heading}>
        {t("my-saved-games", { defaultValue: "My saved games" })}
      </p>
      {games.map((saved) => (
        <SavedGameCard
          key={saved.id}
          saved={saved}
          translationBooks={translationBooks}
          confirming={confirmingId.value === saved.id}
          onPlay={() => loadGame(saved)}
          onEdit={() => onEdit(saved)}
          onAskDelete={() => {
            confirmingId.value = saved.id;
          }}
          onConfirmDelete={() => {
            confirmingId.value = null;
            void onDelete(saved.id);
          }}
          onCancelDelete={() => {
            confirmingId.value = null;
          }}
        />
      ))}
    </div>
  );
}
