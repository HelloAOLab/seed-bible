const { layoutData } = that;

if (layoutData.currentPlaylistShownId && !layoutData.isPlaylistPathEnabled) {
  layoutData.playlistEntries.forEach((entryItem) => {
    entryItem?.vars?.nodes?.forEach?.((node) => {
      setTag(node, "lineTo", null);
    });
  });
}
