setTagMask(thisBot, "isAnimatingMap", true);

const {layoutData} = that;

layoutData.playlistSelectedEntryIndex = 0;
layoutData.currentPlaylistShownId = null;
layoutData.playlistEntries = [];

await thisBot.RespawnAllBooks({layoutData});

layoutData.childrenStructures.forEach((layoutBookStructure) => {
    if(layoutBookStructure.layoutBookData.element)
    {
        const bookMod = { draggable: true }
        applyMod(layoutBookStructure.layoutBookData.element, bookMod);
    }
})

if(layoutData.staticLayoutElements.playlistPreviousButton)
{
    ObjectPooler.ReleaseObject({obj: layoutData.staticLayoutElements.playlistPreviousButton, tag: BibleVizUtils.Data.tags.ObjectPoolTags.MapPlaylistNavigationButton});
    layoutData.staticLayoutElements.playlistPreviousButton = null;
}
if(layoutData.staticLayoutElements.playlistNextButton)
{
    ObjectPooler.ReleaseObject({obj: layoutData.staticLayoutElements.playlistNextButton, tag: BibleVizUtils.Data.tags.ObjectPoolTags.MapPlaylistNavigationButton});
    layoutData.staticLayoutElements.playlistNextButton = null;
}

shout("OnHidePlaylistComplete")