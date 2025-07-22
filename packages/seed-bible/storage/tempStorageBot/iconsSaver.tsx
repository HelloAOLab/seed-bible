globalThis.savePlaylistProgress = () => {
    setTag(thisBot, "customIcons", globalThis['PREDEFINED_ICONS']);
}

const playlistsProgress = (getTag(thisBot, "customIcons") || ['subscriptions', 'smart_display', 'video_library', 'slow_motion_video', 'play_lesson', 'auto_read_play']).filter(ele => ele.content !== "undefined").map(ele => ele);

globalThis['PREDEFINED_ICONS'] = playlistsProgress;