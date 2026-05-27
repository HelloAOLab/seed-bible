setTagMask(thisBot, "isAnimatingMap", true);

const {mapData} = that;

mapData.playlistSelectedEntryIndex = 0;
mapData.currentPlaylistShownId = null;
mapData.playlistEntries = [];

await thisBot.RespawnAllBooksOnMap({mapData});

mapData.childrenStructures.forEach((mapBookStructure) => {
    if(mapBookStructure.mapBookData.element)
    {
        const bookMod = { draggable: true }
        applyMod(mapBookStructure.mapBookData.element, bookMod);
    }
})

if(mapData.staticMapElements.playlistPreviousButton)
{
    ObjectPooler.ReleaseObject({obj: mapData.staticMapElements.playlistPreviousButton, tag: ObjectPoolTags.MapPlaylistNavigationButton});
    mapData.staticMapElements.playlistPreviousButton = null;
}
if(mapData.staticMapElements.playlistNextButton)
{
    ObjectPooler.ReleaseObject({obj: mapData.staticMapElements.playlistNextButton, tag: ObjectPoolTags.MapPlaylistNavigationButton});
    mapData.staticMapElements.playlistNextButton = null;
}

shout("OnHidePlaylistOnMapComplete")