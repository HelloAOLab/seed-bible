import type { Playlist } from "../managers/PlaylistManager";

const ICON_BY_TYPE: Record<Playlist["items"][number]["type"], string> = {
  "bible-verse": "menu_book",
  link: "link",
  html: "notes",
};

/** Material Symbols ligature name for a playlist item's type. */
export function playlistItemIcon(item: Playlist["items"][number]): string {
  return ICON_BY_TYPE[item.type];
}
