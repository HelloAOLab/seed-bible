import "./PlaylistFinishedModal.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";

/**
 * Shown when the listener advances past the last item of a playlist: says the
 * playlist is done and offers to share it. Sharing uses the device share sheet
 * when there is one, and otherwise copies the link and says so in place.
 */
export function PlaylistFinishedModalContent(props: {
  playlistTitle: string;
  shareUrl: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: props.playlistTitle,
          url: props.shareUrl,
        });
      } catch (error) {
        // Dismissing the share sheet rejects with an AbortError; nothing to do.
        if ((error as Error)?.name !== "AbortError") {
          console.error("Failed to share the playlist.", error);
        }
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(props.shareUrl);
      setCopied(true);
    } catch (error) {
      console.error("Failed to copy the playlist link.", error);
    }
  };

  return (
    <div className="sb-playlist-finished" dir="auto">
      <p className="sb-playlist-finished-message">
        {t("playlist-finished-message", {
          title: props.playlistTitle,
          defaultValue: "You've reached the end of {{title}}.",
        })}
      </p>
      {copied ? (
        <p className="sb-playlist-finished-copied" role="status">
          {t("playlist-url-copied", {
            defaultValue: "Playlist URL copied to clipboard",
          })}
        </p>
      ) : null}
      <div className="sb-playlist-finished-actions">
        <button type="button" onClick={props.onClose}>
          {t("close", { defaultValue: "Close" })}
        </button>
        <button
          type="button"
          className="sb-playlist-finished-share"
          onClick={() => void share()}
        >
          {t("share-playlist", { defaultValue: "Share playlist" })}
        </button>
      </div>
    </div>
  );
}
