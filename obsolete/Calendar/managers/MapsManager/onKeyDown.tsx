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

  const mapData = thisBot.vars.mapsData[thisBot.vars.mapsData.length - 1];
  const tempSelectedEntryIndex = Math.max(
    Math.min(
      mapData.playlistSelectedEntryIndex + value,
      mapData.playlistEntries.length - 1
    ),
    0
  );

  if (mapData.playlistSelectedEntryIndex !== tempSelectedEntryIndex)
    thisBot.SetPlaylistSelectedEntryByIndex({
      mapData,
      index: tempSelectedEntryIndex,
    });
}
