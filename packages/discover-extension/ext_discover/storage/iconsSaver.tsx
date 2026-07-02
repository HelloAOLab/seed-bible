import { getStorageBot } from "ext_discover.storage.getStorageBot";

export function iconsSaver() {
  const G = globalThis as Record<string, any>;
  const storageBot = getStorageBot();

  G.savePlaylistIcons = () => {
    setTag(storageBot, "customIcons", G.PREDEFINED_ICONS);
  };

  const playlistsProgress = (
    getTag(storageBot, "customIcons") || [
      "subscriptions",
      "smart_display",
      "video_library",
      "slow_motion_video",
      "play_lesson",
      "auto_read_play",
    ]
  )
    .filter((ele: any) => ele.content !== "undefined")
    .map((ele: any) => ele);

  G.PREDEFINED_ICONS = playlistsProgress;
}
