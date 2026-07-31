const { keys } = that;

if (keys[0] === "ArrowRight" || keys[0] === "ArrowLeft") {
  let value;
  switch (keys[0]) {
    case "ArrowRight":
      value = 1;
      break;

    case "ArrowLeft":
      value = -1;
      break;
  }

  const layoutData =
    thisBot.vars.layoutsData[thisBot.vars.layoutsData.length - 1];
  const tempSelectedEntryIndex = Math.max(
    Math.min(
      layoutData.playlistSelectedEntryIndex + value,
      layoutData.playlistEntries.length - 1
    ),
    0
  );

  if (layoutData.playlistSelectedEntryIndex !== tempSelectedEntryIndex)
    thisBot.SetPlaylistSelectedEntryByIndex({
      layoutData,
      index: tempSelectedEntryIndex,
    });
}
