import "./PlaylistFinishedModal.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import { playlistItemKind } from "../playlistItemSubtitle";

/**
 * Shown when the listener advances past the last item of a playlist: a
 * completion screen with what was read (step and passage counts, then every
 * step by name) and the choice to share the playlist or be done. Sharing uses
 * the device share sheet when there is one, and otherwise copies the link and
 * says so in place.
 */
export function PlaylistFinishedModalContent(props: {
  playlistTitle: string;
  shareUrl: string;
  /** The steps that were read, for the summary. Left out, only the title shows. */
  items?: PlaylistItemData[];
  /** Book names for scripture steps; falls back to the raw book id. */
  resolveBookName?: (bookId: string) => string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [copyResult, setCopyResult] = useState<"copied" | "failed" | null>(
    null
  );
  const items = props.items ?? [];
  const resolveBookName = props.resolveBookName ?? ((bookId) => bookId);
  const passageCount = items.filter(
    (item) => item.type === "bible-verse"
  ).length;

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: props.playlistTitle,
          url: props.shareUrl,
        });
        return;
      } catch (error) {
        // Dismissing the share sheet rejects with an AbortError; nothing to do.
        if ((error as Error)?.name === "AbortError") {
          return;
        }
        // Some browsers expose a share sheet that refuses to open (for
        // example NotAllowedError on desktop), so copy the link instead.
        console.error("Failed to share the playlist.", error);
      }
    }
    try {
      await navigator.clipboard.writeText(props.shareUrl);
      setCopyResult("copied");
    } catch (error) {
      // Also covers no clipboard at all (an insecure origin, some webviews).
      console.error("Failed to copy the playlist link.", error);
      setCopyResult("failed");
    }
  };

  return (
    <div className="sb-playlist-finished" dir="auto">
      <div className="sb-playlist-finished-header">
        <span className="sb-playlist-finished-badge" aria-hidden="true">
          <MaterialIcon>check</MaterialIcon>
        </span>
        <p className="sb-playlist-finished-eyebrow">
          {t("playlist-complete", { defaultValue: "Playlist complete" })}
        </p>
        <h3 className="sb-playlist-finished-title">{props.playlistTitle}</h3>
      </div>

      {items.length > 0 ? (
        <>
          <dl className="sb-playlist-finished-stats">
            <div className="sb-playlist-finished-stat">
              <dd>{items.length}</dd>
              <dt>
                {t("playlist-finished-steps", {
                  defaultValue: "steps",
                  count: items.length,
                })}
              </dt>
            </div>
            <div className="sb-playlist-finished-stat">
              <dd>{passageCount}</dd>
              <dt>
                {t("playlist-finished-passages", {
                  defaultValue: "passages",
                  count: passageCount,
                })}
              </dt>
            </div>
          </dl>

          <section
            className="sb-playlist-finished-read"
            aria-label={t("playlist-finished-what-you-read", {
              defaultValue: "What you read",
            })}
          >
            <h4 className="sb-playlist-finished-read-title">
              {t("playlist-finished-what-you-read", {
                defaultValue: "What you read",
              })}
            </h4>
            <ul className="sb-playlist-finished-read-list">
              {items.map((item, index) => (
                <li key={index} className="sb-playlist-finished-read-item">
                  <span className="sb-playlist-finished-read-label">
                    {playlistItemLabel(item, t, resolveBookName)}
                  </span>
                  <span className="sb-playlist-finished-read-kind">
                    {playlistItemKind(item, t)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {copyResult ? (
        <p className="sb-playlist-finished-copied" role="status">
          {copyResult === "copied"
            ? t("playlist-url-copied", {
                defaultValue: "Playlist URL copied to clipboard",
              })
            : t("playlist-url-copy-failed", {
                defaultValue: "Couldn't copy the playlist link",
              })}
        </p>
      ) : null}
      <div className="sb-playlist-finished-actions">
        <button
          type="button"
          className="sb-playlist-finished-share"
          onClick={() => void share()}
        >
          {t("share-playlist", { defaultValue: "Share playlist" })}
        </button>
        <button
          type="button"
          className="sb-playlist-finished-done"
          onClick={props.onClose}
        >
          {t("done", { defaultValue: "Done" })}
        </button>
      </div>
    </div>
  );
}
