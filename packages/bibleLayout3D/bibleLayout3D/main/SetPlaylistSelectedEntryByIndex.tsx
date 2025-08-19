const {layoutData, index} = that;

const prevSelectedEntry = layoutData.playlistLastSelectedEntryItem;
layoutData.playlistSelectedEntryIndex = index;

for(const entryIndex in layoutData.playlistEntries)
{
    const entry = layoutData.playlistEntries[entryIndex];
    if(!entry) continue;

    if(entryIndex == index)
    {
        let highlightTestament = false;
        let highlightSection = false;
        let highlightBook = false;

        let entryTestamentLine;
        let entrySectionLineSegment;
        let entryBook;
        
        layoutData.playlistLastSelectedEntryItem = entry;

        if(prevSelectedEntry.tags.book !== entry.tags.book || prevSelectedEntry.tags.sectionIndex !== entry.tags.sectionIndex || prevSelectedEntry.tags.testamentIndex !== entry.tags.testamentIndex) 
        {
            highlightBook = true;
            entryBook = GetBookForEntry(entry);

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
            const prevEntryBook = GetBookForEntry(prevSelectedEntry);
            const prevEntrySectionLine = GetSectionLineSegmentForEntry(prevSelectedEntry);
            const prevEntryTestamentLine = GetTestamentLineForEntry(prevSelectedEntry);

            prevEntryBook?.TryStopHighlight();
            prevEntrySectionLine?.TryStopHighlight();
            prevEntryTestamentLine?.TryStopHighlight();
        }

        // let time = os.localTime;

        (highlightTestament ? (entryTestamentLine?.Highlight ? entryTestamentLine.Highlight() : Promise.resolve()) : Promise.resolve()).then(() => {
            // time = os.localTime
            return (highlightSection ? (entrySectionLineSegment?.Highlight ? entrySectionLineSegment.Highlight() : Promise.resolve()) : Promise.resolve()).then(() => {
                // time = os.localTime
                return (highlightBook ? (entryBook?.Highlight ? entryBook.Highlight() : Promise.resolve()) : Promise.resolve()).then(() => {
                    // time = os.localTime
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

thisBot.TryShowPlaylistPath({layoutData})

function GetTestamentLineForEntry(entryItem)
{
    return layoutData.staticLayoutElements.testamentLines.find((testamentLine) => {
        return testamentLine.tags.lineInfo.arrangementIndex == entryItem.tags.arrangementIndex && testamentLine.tags.lineInfo.testamentIndex == entryItem.tags.testamentIndex
    })
}

function GetSectionLineSegmentForEntry(entryItem)
{
    const sectionLine = layoutData.staticLayoutElements.sectionLines.find((currSectionLine) => {
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

function GetBookForEntry(entryItem)
{
    const layoutBookStructure = layoutData.childrenStructures.find((structure) => {
        return structure.layoutBookData.creationInfo.arrangementIndex === entryItem.tags.arrangementIndex &&
            structure.layoutBookData.creationInfo.testamentIndex == entryItem.tags.testamentIndex &&
                structure.layoutBookData.creationInfo.sectionIndex == entryItem.tags.sectionIndex &&
                    structure.layoutBookData.elementInfo.commonName === entryItem.tags.book
    })
    return layoutBookStructure?.layoutBookData?.element;
}