import { Button } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import type { SavedGame, SharedGameView } from "./types";

/**
 * The game a share link opened. It never shows the reference: the player is
 * meant to find it.
 */
export function SharedGameSection({
  view,
  onPlay,
}: {
  view: SharedGameView;
  onPlay: (game: SavedGame) => void;
}) {
  const { t } = useI18n("find-the-verse-extension");

  return (
    <div className="ftv-saved">
      <p className="ftv-saved-heading">
        {t("shared-with-you", { defaultValue: "Shared with you" })}
      </p>
      {view.status === "ok" ? (
        <SharedGameCard
          game={view.game}
          creatorName={view.creatorName}
          onPlay={() => onPlay(view.game)}
        />
      ) : view.status === "loading" ? (
        <p className="ftv-saved-meta">
          {t("shared-game-loading", { defaultValue: "Loading the game…" })}
        </p>
      ) : (
        <p className="ftv-notice">
          {view.status === "not_shared"
            ? t("shared-game-not-shared", {
                defaultValue: "This game isn't shared any more.",
              })
            : view.status === "privacy_blocked"
              ? t("shared-game-blocked-privacy", {
                  defaultValue:
                    "This game can't be opened because of account privacy settings.",
                })
              : t("shared-game-load-failed", {
                  defaultValue: "Couldn't load this game. Try again later.",
                })}
        </p>
      )}
    </div>
  );
}

function SharedGameCard({
  game,
  creatorName,
  onPlay,
}: {
  game: SavedGame;
  creatorName: string | null;
  onPlay: () => void;
}) {
  const { t } = useI18n("find-the-verse-extension");
  const chances = game.steps.length;

  return (
    <div className="ftv-saved-card">
      <div className="ftv-saved-info">
        <span className="ftv-saved-ref">
          {game.name.trim() ||
            t("shared-game-untitled", { defaultValue: "Shared game" })}
        </span>
        <span className="ftv-saved-meta">
          {creatorName && (
            <>
              {t("shared-game-by", {
                name: creatorName,
                defaultValue: "By {{name}}",
              })}
              {" · "}
            </>
          )}
          {t("chance-count", {
            count: chances,
            defaultValue:
              chances === 1 ? "{{count}} chance" : "{{count}} chances",
          })}
        </span>
      </div>
      <Button
        className="ftv-saved-action"
        variant="primary"
        size="sm"
        onClick={onPlay}
      >
        {t("play", { defaultValue: "Play" })}
      </Button>
    </div>
  );
}
