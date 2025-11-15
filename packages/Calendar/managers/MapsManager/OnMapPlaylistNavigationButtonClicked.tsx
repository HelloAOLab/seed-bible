const {button} = that;

const mapData = thisBot.GetMapDataById({mapId: button.tags.mapId});
const tempSelectedEntryIndex = Math.max(Math.min((mapData.playlistSelectedEntryIndex + button.tags.navigationValue), (mapData.playlistEntries.length - 1)), 0);

if(mapData.playlistSelectedEntryIndex !== tempSelectedEntryIndex) thisBot.SetPlaylistSelectedEntryByIndex({mapData, index: tempSelectedEntryIndex})