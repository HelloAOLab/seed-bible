const { layoutData } = that;

if (layoutData.currentPlaylistShownId && layoutData.isPlaylistPathEnabled) {
  thisBot.ShowPlaylistPath({ layoutData });
}
