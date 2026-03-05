const { mapData } = that;

if (mapData.currentPlaylistShownId && !mapData.isPlaylistPathEnabled) {
  mapData.playlistEntries.forEach((entryItem: any) => {
    entryItem?.vars?.nodes?.forEach?.((node: any) => {
      setTag(node, "lineTo", null);
    });
  });
}
