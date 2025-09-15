const {source = "Unknown"} = that ?? {};

if(thisBot.vars.stackBiblesData.lenght === 0 || !thisBot.vars.tabsContext.activeTab) return;

if(thisBot.masks.isBibleAnimating || thisBot.masks.isMakingTabsVizUpdate)
{

    thisBot.masks.isTabVizUpdateQueued = true;
    // setTagMask(thisBot, "isTabVizUpdateQueued", true);
    return;
}

thisBot.masks.isTabVizUpdateQueued = false;
// setTagMask(thisBot, "isTabVizUpdateQueued", false);
setTagMask(thisBot, "isMakingTabsVizUpdate", true);

const activeTab = thisBot.vars.tabsContext.tabs.find((tab) => {return tab.id === thisBot.vars.tabsContext.activeTab});

if(activeTab)
{

    const dimension = os.getCurrentDimension();
    const chapterSelectionAnimations = [];
    const chaptersToDeselect = [];
    let chapterToFocus;

    thisBot.vars.stackChaptersData.forEach((chapterData) => {

        const book = chapterData.creationInfo.bookName;
        const chapter = chapterData.pieceInfo.number;
        const isAnimatable = chapterData.piece && chapterData.piece.tags.isInUse && chapterData.piece.tags[dimension] == true;
        const isActiveChapter = activeTab.data.book == book && activeTab.data.chapter == chapter;

        if(chapterData.isSelected && isAnimatable && !chapterData.piece.masks.isOnTheGround && !isActiveChapter)
        {
            chaptersToDeselect.push(chapterData);
        }
        if(isActiveChapter)
        {
            if(chapterData.parentDataIds.stackBibleId)
            {
                chapterToFocus = chapterData;
            }
            else
            {
                if(isAnimatable)
                {
                    if(!chapterData.isSelected)
                    {
                        chapterSelectionAnimations.push(thisBot.TrySelectChapter({info: {chapterData} }));
                    }
                }
            }
        }
    })

    if(chapterToFocus)
    {
        const bookData = thisBot.vars.stackBooksData.find((bookData) => { return bookData.id === chapterToFocus.parentDataIds.stackBookId });
        const sectionData = thisBot.vars.stackSectionsData.find((data) => { return data.id === chapterToFocus.parentDataIds.stackSectionId });
        const testamentData = thisBot.vars.stackTestamentsData.find((data) => { return data.id === chapterToFocus.parentDataIds.stackTestamentId });
        const bibleData = thisBot.GetBibleDataById({stackBibleId: chapterToFocus.parentDataIds.stackBibleId});
        const shouldResetStack = (!testamentData.isActive || testamentData.isSplitIntoSections) && 
            (!sectionData.isActive || sectionData.isSplitIntoBooks) && 
            (!bookData.isActive || bookData.isSelected) && 
            !chapterToFocus.isActive &&
            !chapterToFocus.parentDataIds.stackBibleId;

        const speedMultiplierConditions = [
            !testamentData.isSplitIntoSections,
            !sectionData.isSplitIntoBooks,
            !sectionData.isInExplodedView,
            !bookData.isSelected
        ];

        console.log(`[Debug] UpdateStackTabsVisualization`, {
            testamentData: JSON.parse(JSON.stringify({...testamentData, piece: null})),
            sectionData: JSON.parse(JSON.stringify({...sectionData, piece: null})), 
            bookData: JSON.parse(JSON.stringify({...bookData, piece: null})), 
            chapterToFocus: JSON.parse(JSON.stringify({...chapterToFocus, piece: null}))
        })

        const speedMultiplier = shouldResetStack || (speedMultiplierConditions.filter(Boolean).length > 1) ? 2 : 1;

        const animation = (shouldResetStack ? thisBot.ResetBible({bibleData, speedMultiplier}) : os.sleep(1))
        .then(() => {

            if(thisBot.masks.isTabVizUpdateQueued)
            {
                return true;
            }

            return (testamentData.isSplitIntoSections ? os.sleep(1) : thisBot.SelectTestament({testament: testamentData.piece, speedMultiplier}))
            .then(() => {

                if(thisBot.masks.isTabVizUpdateQueued)
                {
                    return true;
                }

                return (sectionData.isSplitIntoBooks ? os.sleep(1) : thisBot.SelectSection({section: sectionData.piece, speedMultiplier}))
                .then(() => {

                    if(thisBot.masks.isTabVizUpdateQueued)
                    {
                        return true;
                    }

                    return (sectionData.isInExplodedView ? os.sleep(1) : thisBot.TrySetSectionAsExplodedView({section: sectionData.piece, speedMultiplier}))
                    .then(() => {

                        if(thisBot.masks.isTabVizUpdateQueued)
                        {
                            return true;
                        }

                        return (bookData.isSelected ? os.sleep(1) : thisBot.SelectBook({book: bookData.piece, speedMultiplier}))
                        .then(() => {

                            if(thisBot.masks.isTabVizUpdateQueued)
                            {
                                return true;
                            }

                            return thisBot.TrySelectChapter({info: {chapterData: chapterToFocus} })
                        })
                    })
                })
            })
        })

        chapterSelectionAnimations.push(animation)
    }

    const allAnimations = [
        ...chapterSelectionAnimations,
        chaptersToDeselect.length > 0 ? thisBot.DeselectChapter({info: chaptersToDeselect.map((chapterData) => { return {chapterData }})}) : null
    ].filter(Boolean)
    
    return (allAnimations.length > 0 ? Promise.all(allAnimations) : os.sleep(1)).then(() => {
        setTagMask(thisBot, "isMakingTabsVizUpdate", false);
        if(thisBot.masks.isTabVizUpdateQueued)
        {
            thisBot.UpdateStackTabsVisualization({source: "UpdateStackTabsVisualization"});
        }
    })
}