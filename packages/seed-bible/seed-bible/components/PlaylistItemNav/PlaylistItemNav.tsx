import "./PlaylistItemNav.css";
import { useI18n } from "../../i18n/I18nManager";
import type { PlayingState } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";

/**
 * Previous / Next buttons shown under a playlist item's content while the
 * playlist is playing, so the listener can move through the queue without
 * leaving the modal.
 */
export function PlaylistItemNav(props: { playing: PlayingState }) {
  const { playing } = props;
  const { t } = useI18n();

  return (
    <div className="sb-playlist-item-nav">
      <button
        type="button"
        className="sb-playlist-item-nav-previous"
        disabled={!playing.hasPrevious.value}
        onClick={() => void playing.previous()}
      >
        <MaterialIcon>skip_previous</MaterialIcon>
        {t("previous", { defaultValue: "Previous" })}
      </button>
      <button
        type="button"
        className="sb-playlist-item-nav-next"
        disabled={!playing.canPressNext.value}
        onClick={() => void playing.next()}
      >
        {t("next", { defaultValue: "Next" })}
        <MaterialIcon>skip_next</MaterialIcon>
      </button>
    </div>
  );
}
