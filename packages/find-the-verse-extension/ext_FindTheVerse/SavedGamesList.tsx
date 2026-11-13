import type { SeedBibleState } from "seed-bible";
import { useSignal } from "@preact/signals";
import {
  Button,
  ContextMenuItem,
  ContextMenuWithButton,
} from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { formatReference } from "./books";
import type { SavedGame } from "./types";

interface SavedGamesListProps {
  games: SavedGame[];
  state: SeedBibleState;
  onPlay: (saved: SavedGame) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (saved: SavedGame) => void;
}

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
  const showReference = () => {
    referenceShown.value = true;
  };

  return (
    <div className="ftv-saved-card">
      <div className="ftv-saved-info">
        {referenceShown.value ? (
          <span className="ftv-saved-ref">{reference}</span>
        ) : gameName ? (
          <>
            <span className="ftv-saved-ref">{gameName}</span>
            <button
              type="button"
              className="ftv-show-reference ftv-show-reference--link"
              onClick={showReference}
            >
              {t("show-reference", { defaultValue: "Show reference" })}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ftv-show-reference"
            onClick={showReference}
          >
            {t("show-reference", { defaultValue: "Show reference" })}
          </button>
        )}
        <span className="ftv-saved-meta">
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
          <span className="ftv-saved-meta">
            {t("delete-confirm", { defaultValue: "Delete this game?" })}
          </span>
        )}
      </div>

      {confirming ? (
        <>
          <Button
            className="ftv-saved-action"
            variant="primary"
            tone="danger"
            size="sm"
            onClick={onConfirmDelete}
          >
            {t("delete", { defaultValue: "Delete" })}
          </Button>
          <Button
            className="ftv-saved-action"
            variant="ghost"
            size="sm"
            onClick={onCancelDelete}
          >
            {t("cancel", { defaultValue: "Cancel" })}
          </Button>
        </>
      ) : (
        <>
          <Button
            className="ftv-saved-action"
            variant="primary"
            size="sm"
            onClick={onPlay}
          >
            {t("play", { defaultValue: "Play" })}
          </Button>
          <ContextMenuWithButton
            label={t("game-options", { defaultValue: "Game options" })}
          >
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
  state,
  onPlay,
  onDelete,
  onEdit,
}: SavedGamesListProps) {
  const { t } = useI18n("find-the-verse-extension");
  const confirmingId = useSignal<string | null>(null);
  if (games.length === 0) return null;

  const translationBooks =
    state.app.selectedTab.value?.readingState.translationBooks.value?.books;

  return (
    <div className="ftv-saved">
      <p className="ftv-saved-heading">
        {t("my-saved-games", { defaultValue: "My saved games" })}
      </p>
      {games.map((saved) => (
        <SavedGameCard
          key={saved.id}
          saved={saved}
          translationBooks={translationBooks}
          confirming={confirmingId.value === saved.id}
          onPlay={() => onPlay(saved)}
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
