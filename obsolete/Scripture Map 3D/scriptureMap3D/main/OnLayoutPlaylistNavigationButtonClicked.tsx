const { button } = that;

const layoutData = thisBot.GetLayoutDataById({
  layoutId: button.tags.layoutId,
});
const tempSelectedEntryIndex = Math.max(
  Math.min(
    layoutData.playlistSelectedEntryIndex + button.tags.navigationValue,
    layoutData.playlistEntries.length - 1
  ),
  0
);

if (layoutData.playlistSelectedEntryIndex !== tempSelectedEntryIndex)
  thisBot.SetPlaylistSelectedEntryByIndex({
    layoutData,
    index: tempSelectedEntryIndex,
  });
