import "./PlaylistItemNoteTag.css";
import { useI18n } from "../../i18n/I18nManager";
import {
  hasScriptureNote,
  type PlaylistItemData,
} from "../../managers/PlaylistManager";

/**
 * Follows a scripture item's label in a list of items (" · The upside-down
 * kingdom") to show it has a note. An untitled note shows as " · Note" when
 * `showUntitled` is set, so an editor can see every note it holds, and
 * nothing otherwise.
 */
export function PlaylistItemNoteTag(props: {
  item: PlaylistItemData;
  showUntitled?: boolean;
}) {
  const { item, showUntitled } = props;
  const { t } = useI18n();
  if (!hasScriptureNote(item)) {
    return null;
  }
  const title =
    item.noteTitle?.trim() ||
    (showUntitled
      ? t("playlist-scripture-note-label", { defaultValue: "Note" })
      : null);
  return title ? (
    <span className="sb-playlist-item-note-tag">
      {" · "}
      {title}
    </span>
  ) : null;
}
