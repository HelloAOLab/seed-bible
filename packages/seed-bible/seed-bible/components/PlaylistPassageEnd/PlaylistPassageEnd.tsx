import "./PlaylistPassageEnd.css";
import { useI18n } from "../../i18n/I18nManager";
import type { PlayingState } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";

/**
 * Sits in the chapter text right after the passage a playing playlist is on,
 * so the reader knows where the step ends and can move on from there
 * instead of going back to the player. Offers the next step by name, or
 * finishing the playlist on its last step.
 */
export function PlaylistPassageEnd(props: {
  playing: PlayingState;
  resolveBookName: (bookId: string) => string;
}) {
  const { playing, resolveBookName } = props;
  const { t } = useI18n();
  const queue = playing.queue.value;
  const nextItem = queue[playing.currentIndex.value + 1] ?? null;
  const canFinish = !nextItem && playing.canPressNext.value;

  return (
    <div className="sb-playlist-passage-end" dir="auto">
      <span className="sb-playlist-passage-end-label">
        {t("end-of-passage", { defaultValue: "End of passage" })}
      </span>
      {nextItem || canFinish ? (
        <button
          type="button"
          className="sb-playlist-passage-end-next"
          onClick={() => void playing.next()}
        >
          {nextItem
            ? t("playlist-next-step", {
                defaultValue: "Next · {{title}}",
                title: playlistItemLabel(nextItem, t, resolveBookName),
              })
            : t("finish-playlist", { defaultValue: "Finish playlist" })}
          <MaterialIcon>arrow_forward</MaterialIcon>
        </button>
      ) : null}
    </div>
  );
}
