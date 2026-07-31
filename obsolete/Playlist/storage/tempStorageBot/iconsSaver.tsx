const G = globalThis as any;
G.savePlaylistProgress = () => {
  setTag(thisBot, "customIcons", G["PREDEFINED_ICONS"]);
};

const playlistsProgress = (
  getTag(thisBot, "customIcons") || [
    "subscriptions",
    "smart_display",
    "video_library",
    "slow_motion_video",
    "play_lesson",
    "auto_read_play",
  ]
)
  .filter((ele) => ele.content !== "undefined")
  .map((ele) => ele);

G["PREDEFINED_ICONS"] = playlistsProgress;
