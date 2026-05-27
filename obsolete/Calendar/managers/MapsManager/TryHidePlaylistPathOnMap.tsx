const {mapData} = that;

if(mapData.currentPlaylistShownId && !mapData.isPlaylistPathEnabled)
{
    mapData.playlistEntries.forEach((entryItem) => {
        entryItem?.vars?.nodes?.forEach?.((node) => {
            setTag(node, "lineTo", null);
        })
    })
}