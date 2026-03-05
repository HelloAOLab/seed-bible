const G = globalThis;
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
  .filter((ele: any) => ele.content !== "undefined")
  .map((ele: any) => ele);

G["PREDEFINED_ICONS"] = playlistsProgress;
