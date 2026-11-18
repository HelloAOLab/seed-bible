import type { SeedBibleState } from "seed-bible";
import { useSignal } from "@preact/signals";
import {
  Button,
  ContextMenuItem,
  ContextMenuWithButton,
  MaterialIcon,
} from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { formatReference } from "./books";
import type { SavedGame } from "./types";
import { sharedGameUrl } from "./gamesStore";

interface SavedGamesListProps {
  games: SavedGame[];
  state: SeedBibleState;
  onPlay: (saved: SavedGame) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (saved: SavedGame) => void;
  onShare: (id: string, shared: boolean) => Promise<void>;
}

function SharedLabel() {
  const { t } = useI18n("find-the-verse-extension");

  return (
    <span className="ftv-shared-label">
      {t("shared", { defaultValue: "Shared" })}
    </span>
  );
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
  toast,
  onShare,
  shareUrl,
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
  toast: SeedBibleState["app"]["toast"];
  onShare: (shared: boolean) => Promise<void>;
  shareUrl: string | null;
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

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast(t("link-copied", { defaultValue: "Link copied" }));
    } catch {
      toast(t("copy-link-failed", { defaultValue: "Couldn't copy the link" }));
    }
  };

  const share = async () => {
    if (!shareUrl) return;
    let copied = true;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      copied = false;
    }
    try {
      await onShare(true);
    } catch {
      return; // GamePane shows the share error in the panel notice.
    }
    toast(
      copied
        ? t("link-copied", { defaultValue: "Link copied" })
        : t("copy-link-failed", { defaultValue: "Couldn't copy the link" })
    );
  };

  const stopSharing = () =>
    onShare(false).catch(() => {
      // GamePane already shows the error in the panel notice.
    });

  const title = referenceShown.value ? (
    <span className="ftv-saved-ref">{reference}</span>
  ) : gameName ? (
    <span className="ftv-saved-ref">{gameName}</span>
  ) : (
    <button
      type="button"
      className="ftv-show-reference"
      onClick={showReference}
    >
      {t("show-reference", { defaultValue: "Show reference" })}
    </button>
  );

  return (
    <div className="ftv-saved-card">
      <div className="ftv-saved-info">
        <div className="ftv-saved-title">
          {title}
          {saved.shared && <SharedLabel />}
        </div>
        {gameName && !referenceShown.value && (
          <button
            type="button"
            className="ftv-show-reference ftv-show-reference--link"
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
            {saved.shared ? (
              <>
                <ContextMenuItem onClick={copyLink}>
                  <MaterialIcon>link</MaterialIcon>
                  {t("copy-link", { defaultValue: "Copy link" })}
                </ContextMenuItem>
                <ContextMenuItem onClick={stopSharing}>
                  <MaterialIcon>share_off</MaterialIcon>
                  {t("stop-sharing", { defaultValue: "Stop sharing" })}
                </ContextMenuItem>
              </>
            ) : (
              <ContextMenuItem onClick={share}>
                <MaterialIcon>share</MaterialIcon>
                {t("share", { defaultValue: "Share" })}
              </ContextMenuItem>
            )}
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
  onShare,
}: SavedGamesListProps) {
  const { t } = useI18n("find-the-verse-extension");
  const confirmingId = useSignal<string | null>(null);
  if (games.length === 0) return null;

  const translationBooks =
    state.app.selectedTab.value?.readingState.translationBooks.value?.books;

  const userId = state.login.userId.value;

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
          toast={state.app.toast}
          shareUrl={
            userId ? sharedGameUrl(state.navigation, userId, saved.id) : null
          }
          onShare={(shared) => onShare(saved.id, shared)}
        />
      ))}
    </div>
  );
}
