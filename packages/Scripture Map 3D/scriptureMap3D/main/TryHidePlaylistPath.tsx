const { layoutData } = that;

if (layoutData.currentPlaylistShownId && !layoutData.isPlaylistPathEnabled) {
  layoutData.playlistEntries.forEach((entryItem: any) => {
    entryItem?.vars?.nodes?.forEach?.((node: any) => {
      setTag(node, "lineTo", null);
    });
  });
}
