const {layoutData, playlistInfo} = that;

if(!playlistInfo) return;

const { playlistId } = playlistInfo;

setTagMask(thisBot, "isAnimatingMap", true);

const dimension = os.getCurrentDimension();
layoutData.currentPlaylistShownId = playlistId;
const playlistItemsList = playlistInfo.list.slice()
thisBot.HideCurrentMapBookDateLabelShown();

await thisBot.RespawnAllBooksOnMap({layoutData});

layoutData.childrenStructures.forEach((layoutBookStructure) => {
    if(layoutBookStructure.layoutBookData.element)
    {
        const bookMod = { draggable: false }
        applyMod(layoutBookStructure.layoutBookData.element, bookMod);
    }
})

const playlistEntryItemHeight = 0.25;

for(const playlistEntryInfoIndex in playlistItemsList)
{
    const playlistEntryInfo = playlistItemsList[playlistEntryInfoIndex];

    switch(playlistEntryInfo.type)
    {
        case PlaylistItemType.Chapter: 
        case PlaylistItemType.Verse: {
            const layoutBookStructure = layoutData.childrenStructures.find((structure) => {
                return structure.layoutBookData.elementInfo.commonName === playlistEntryInfo.additionalInfo[playlistEntryInfo.type === PlaylistItemType.Verse ? "book" : "bookName"]
            })
            
            if(!layoutBookStructure.layoutBookData.isSelected)
            {
                const chaptersMod = { draggable: false }
                await thisBot.SelectMapBook({layoutBookData: layoutBookStructure.layoutBookData, layoutData, chaptersMod})
            }
            const chapterData = layoutBookStructure.layoutBookData.childrenData.find((data) => {
                return data.elementInfo.number === playlistEntryInfo.additionalInfo.chapter
            })

            const chapterPosition = getBotPosition(chapterData.element, dimension);

            const itemPositionZ = BibleVizUtils.Data.BibleLayoutMeasurements.BookPositionZ + (chapterData.playlistEntriesItems.length * (playlistEntryItemHeight + BibleVizUtils.Data.BibleLayoutMeasurements.PlaylistStackedEntryItemGap))

            const entryItem = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapterPlaylistEntryItem});
            chapterData.AddEntryItem(entryItem);
            const index = layoutData.playlistEntries.push(entryItem) - 1;
            const entryItemMod = {
                [dimension]: true,
                [dimension + "X"]: chapterPosition.x,
                [dimension + "Y"]: chapterPosition.y,
                [dimension + "Z"]: itemPositionZ,
                scaleX: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterWidth + BibleVizUtils.Data.BibleLayoutMeasurements.PlaylistEntryItemPadding,
                scaleY: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterHeight + BibleVizUtils.Data.BibleLayoutMeasurements.PlaylistEntryItemPadding,
                scaleZ: playlistEntryItemHeight,
                label: chapterData.element.tags.label,
                color: index < layoutData.playlistSelectedEntryIndex ? "#D3D3D3" : (index > layoutData.playlistSelectedEntryIndex ? "#FFFFFF" : "#DCF0EC"),
                strokeColor: index < layoutData.playlistSelectedEntryIndex ? "#D3D3D3" : (index > layoutData.playlistSelectedEntryIndex ? "#FFFFFF" : "#139981"),
                arrangementIndex: layoutBookStructure.layoutBookData.creationInfo.arrangementIndex,
                testamentIndex: layoutBookStructure.layoutBookData.creationInfo.testamentIndex,
                sectionIndex: layoutBookStructure.layoutBookData.creationInfo.sectionIndex,
                book: layoutBookStructure.layoutBookData.elementInfo.commonName,
                chapter: chapterData.elementInfo.number,
                index: playlistEntryInfoIndex,
                bookColumn: layoutBookStructure.column,
                bookRow: layoutBookStructure.row,
            }
            entryItem.OnSpawned({mod: entryItemMod});
            entryItem.vars.nodes = [];
            if(index === layoutData.playlistSelectedEntryIndex) layoutData.playlistLastSelectedEntryItem = entryItem;
        }
        break;
        
        default: {
            layoutData.playlistEntries.push(null);
        }
        break;
    }
}

thisBot.TryShowPlaylistPathOnMap({layoutData})

const coverPosition = getBotPosition(layoutData.staticLayoutElements.cover, dimension);
const coverScales = GetBotScales(layoutData.staticLayoutElements.cover)

const prevButton = layoutData.staticLayoutElements.playlistPreviousButton ?? ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.MapPlaylistNavigationButton});
const nextButton = layoutData.staticLayoutElements.playlistNextButton ?? ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.MapPlaylistNavigationButton});

const prevButtonMod = {
    label: "<",
    scaleX: prevButton.tags.scaleX,
    scaleY: prevButton.tags.scaleY,
    scaleZ: prevButton.tags.scaleZ,
    [dimension]: true,
    [dimension + "X"]: coverPosition.x - (coverScales.x/2) + (prevButton.tags.scaleX/2),
    [dimension + "Y"]: coverPosition.y - (coverScales.y/2) - BibleVizUtils.Data.BibleLayoutMeasurements.PlaylistNavigationButtonVerticalGap - (prevButton.tags.scaleY/2),
    [dimension + "Z"]: 0,
    navigationValue: -1,
    layoutId: layoutData.id
}

const nextButtonMod = {
    space: "tempLocal",
    label: ">",
    scaleX: prevButton.tags.scaleX,
    scaleY: prevButton.tags.scaleY,
    scaleZ: prevButton.tags.scaleZ,
    [dimension]: true,
    [dimension + "X"]: coverPosition.x + (coverScales.x/2) - (prevButton.tags.scaleX/2),
    [dimension + "Y"]: coverPosition.y - (coverScales.y/2) - BibleVizUtils.Data.BibleLayoutMeasurements.PlaylistNavigationButtonVerticalGap - (prevButton.tags.scaleY/2),
    [dimension + "Z"]: 0,
    navigationValue: 1,
    layoutId: layoutData.id
}

prevButton.OnSpawned({mod: prevButtonMod});
nextButton.OnSpawned({mod: nextButtonMod});

layoutData.staticLayoutElements.playlistPreviousButton = prevButton;
layoutData.staticLayoutElements.playlistNextButton = nextButton;

shout("OnShowPlaylistOnMapComplete")