import "./PlaylistItemNav.css";
import { useI18n } from "../../i18n/I18nManager";
import type { PlayingState } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";

/**
 * Previous / Next step for a playing playlist. Next becomes Finish on the
 * last step; `nextLabel` replaces it (as "Begin" does on an overview step).
 */
export function PlaylistItemNav(props: {
  playing: PlayingState;
  nextLabel?: string;
}) {
  const { playing, nextLabel } = props;
  const { t } = useI18n();
  const hasNext = playing.hasNext.value;

  return (
    <div className="sb-playlist-item-nav">
      <button
        type="button"
        className="sb-playlist-item-nav-previous"
        disabled={!playing.hasPrevious.value}
        onClick={() => void playing.previous()}
      >
        {t("previous", { defaultValue: "Previous" })}
      </button>
      <button
        type="button"
        className="sb-playlist-item-nav-next"
        disabled={!playing.canPressNext.value}
        onClick={() => void playing.next()}
      >
        {nextLabel ??
          (hasNext
            ? t("playlist-next-step-button", { defaultValue: "Next step" })
            : t("finish", { defaultValue: "Finish" }))}
        <MaterialIcon>arrow_forward</MaterialIcon>
      </button>
    </div>
  );
}
