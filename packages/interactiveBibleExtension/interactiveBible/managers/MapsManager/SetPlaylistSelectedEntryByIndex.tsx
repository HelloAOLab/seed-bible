const {mapData, index} = that;

const prevSelectedEntry = mapData.playlistLastSelectedEntryItem;
mapData.playlistSelectedEntryIndex = index;

for(const entryIndex in mapData.playlistEntries)
{
    const entry = mapData.playlistEntries[entryIndex];
    if(!entry) continue;

    if(entryIndex == index)
    {
        let highlightTestament = false;
        let highlightSection = false;
        let highlightBook = false;

        let entryTestamentLine;
        let entrySectionLineSegment;
        let entryBook;
        
        mapData.playlistLastSelectedEntryItem = entry;

        if(prevSelectedEntry.tags.book !== entry.tags.book || prevSelectedEntry.tags.sectionIndex !== entry.tags.sectionIndex || prevSelectedEntry.tags.testamentIndex !== entry.tags.testamentIndex) 
        {
            highlightBook = true;
            entryBook = GetMapBookForEntry(entry);

            if(prevSelectedEntry.tags.sectionIndex !== entry.tags.sectionIndex || prevSelectedEntry.tags.testamentIndex !== entry.tags.testamentIndex)
            {
                highlightSection = true;
                entrySectionLineSegment = GetSectionLineSegmentForEntry(entry);

                if(prevSelectedEntry.tags.testamentIndex !== entry.tags.testamentIndex) 
                {
                    highlightTestament = true;
                    entryTestamentLine = GetTestamentLineForEntry(entry)
                }
            }
        }
        
        if(prevSelectedEntry)
        {
            const prevEntryBook = GetMapBookForEntry(prevSelectedEntry);
            const prevEntrySectionLine = GetSectionLineSegmentForEntry(prevSelectedEntry);
            const prevEntryTestamentLine = GetTestamentLineForEntry(prevSelectedEntry);

            prevEntryBook?.TryStopHighlight();
            prevEntrySectionLine?.TryStopHighlight();
            prevEntryTestamentLine?.TryStopHighlight();
        }

        let time = os.localTime;

        (highlightTestament ? entryTestamentLine?.Highlight?.() : Promise.resolve()).then(() => {
            time = os.localTime
            return (highlightSection ? entrySectionLineSegment?.Highlight?.() : Promise.resolve()).then(() => {
                time = os.localTime
                return (highlightBook ? entryBook?.Highlight?.() : Promise.resolve()).then(() => {
                    time = os.localTime
                    return entry.Highlight().then(() => {
                    });
                })
            }) 
        });
    }
    else
    {
        entry.TryStopHighlight();
        let entryItemMod;
        if(entryIndex < index)
        {
            entryItemMod = {
                color: "#D3D3D3",
                strokeColor: "#D3D3D3"
            }
        }
        else if(entryIndex > index)
        {
            entryItemMod = {
                color: "#FFFFFF",
                strokeColor: "#FFFFFF"
            }
        }

        setTagMask(entry, "color", entryItemMod.color);
        setTagMask(entry, "strokeColor", entryItemMod.strokeColor);
    }
    
}

thisBot.TryShowPlaylistPathOnMap({mapData})

function GetTestamentLineForEntry(entryItem)
{
    return mapData.staticMapElements.testamentLines.find((testamentLine) => {
        return testamentLine.tags.lineInfo.arrangementIndex == entryItem.tags.arrangementIndex && testamentLine.tags.lineInfo.testamentIndex == entryItem.tags.testamentIndex
    })
}

function GetSectionLineSegmentForEntry(entryItem)
{
    const sectionLine = mapData.staticMapElements.sectionLines.find((currSectionLine) => {
        const segmentInfo = currSectionLine.tags.lineInfo.segments[currSectionLine.tags.segmentIndex];
        return currSectionLine.tags.lineInfo.arrangementIndex == entryItem.tags.arrangementIndex &&
            currSectionLine.tags.lineInfo.testamentIndex == entryItem.tags.testamentIndex &&
                currSectionLine.tags.lineInfo.sectionIndex == entryItem.tags.sectionIndex &&
                    segmentInfo.start.row === entryItem.tags.bookRow &&
                        entryItem.tags.bookColumn >= segmentInfo.start.column &&
                            entryItem.tags.bookColumn <= segmentInfo.end.column
    })
    return sectionLine
}

function GetMapBookForEntry(entryItem)
{
    const mapBookStructure = mapData.childrenStructures.find((structure) => {
        return structure.mapBookData.creationInfo.arrangementIndex === entryItem.tags.arrangementIndex &&
            structure.mapBookData.creationInfo.testamentIndex == entryItem.tags.testamentIndex &&
                structure.mapBookData.creationInfo.sectionIndex == entryItem.tags.sectionIndex &&
                    structure.mapBookData.elementInfo.commonName === entryItem.tags.book
    })
    return mapBookStructure?.mapBookData?.element;
}