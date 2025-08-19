const {layoutData} = that;

const dimension = os.getCurrentDimension();

layoutData.playlistEntries.filter((entryItem) => {

    return entryItem !== null;

}).forEach((entryItem, index, array) => {

    const prevEntryItem = array[index - 1];
    if(index > 0 && (prevEntryItem.tags.book !== entryItem.tags.book || prevEntryItem.tags.chapter !== entryItem.tags.chapter))
    {
        const layoutBookStructure = layoutData.childrenStructures.find((structure) => { return structure.layoutBookData.elementInfo.commonName === entryItem.tags.book })
        const chapterData = layoutBookStructure.layoutBookData.childrenData.find((data) => { return data.elementInfo.number === entryItem.tags.chapter })
        const chapterDataLastEntryItem = chapterData.playlistEntriesItems[chapterData.playlistEntriesItems.length - 1];

        const prevMapBookStructure = layoutData.childrenStructures.find((structure) => { return structure.layoutBookData.elementInfo.commonName === prevEntryItem.tags.book })
        const prevChapterData = prevMapBookStructure.layoutBookData.childrenData.find((data) => { return data.elementInfo.number === prevEntryItem.tags.chapter })
        const prevChapterDataLastEntryItem = prevChapterData.playlistEntriesItems[prevChapterData.playlistEntriesItems.length - 1];

        let node = prevChapterDataLastEntryItem.vars.nodes?.find?.((node) => {
            return node.tags.isInUse && node.tags.linkedTo === chapterDataLastEntryItem.id && node.tags.index == prevEntryItem.tags.index
        })
        if(!node)
        {
            const prevChapterDataLastEntryItemPosition = getBotPosition(prevChapterDataLastEntryItem, dimension);
            const prevChapterDataLastEntryItemScales = GetBotScales(prevChapterDataLastEntryItem);
            node = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapterPlaylistEntryNode})
            const mod = {
                [dimension]: true,
                [dimension + "X"]: prevChapterDataLastEntryItemPosition.x,
                [dimension + "Y"]: prevChapterDataLastEntryItemPosition.y,
                [dimension + "Z"]: prevChapterDataLastEntryItemPosition.z,
                linkedTo: chapterDataLastEntryItem.id,
                index: prevEntryItem.tags.index,
                scaleX: prevChapterDataLastEntryItemScales.x,
                scaleY: prevChapterDataLastEntryItemScales.y,
                scaleZ: prevChapterDataLastEntryItemScales.z
            }
            node.OnSpawned({mod});
            prevChapterDataLastEntryItem.vars.nodes.push(node);
        }
        setTag(node, "lineTo", node.tags.linkedTo);
        setTag(node, "lineColor", layoutData.playlistSelectedEntryIndex >= entryItem.tags.index ? "lightgrey" : "white")
    }
})