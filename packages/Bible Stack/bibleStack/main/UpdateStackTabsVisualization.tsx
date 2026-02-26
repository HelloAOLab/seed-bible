import { scriptureService } from "bibleVizUtils.services.index";

if (
  thisBot.vars.stackBiblesData.lenght === 0 ||
  !thisBot.vars.tabsContext.activeTab
)
  return;

if (thisBot.masks.isBibleAnimating || thisBot.masks.isMakingTabsVizUpdate) {
  setTagMask(thisBot, "isTabVizUpdateQueued", true);
  return;
}

setTagMask(thisBot, "isTabVizUpdateQueued", false);
setTagMask(thisBot, "isMakingTabsVizUpdate", true);

const activeTab = thisBot.vars.tabsContext.tabs.find((tab) => {
  return tab.id === thisBot.vars.tabsContext.activeTab;
});

if (activeTab) {
  const dimension = os.getCurrentDimension();
  const chapterSelectionAnimations = [];
  const chaptersToDeselect = [];
  let chapterToFocus;

  thisBot.vars.stackChaptersData.forEach((chapterData) => {
    let book = chapterData.creationInfo.bookName;
    let chapter = chapterData.pieceInfo.number;
    if (book.includes("Psalms")) {
      ({ chapter } = scriptureService.convertDividedPsalmsToComplete({
        book,
        chapter,
      }));
      book = "Psalms";
    }
    const isAnimatable =
      chapterData.piece &&
      chapterData.piece.tags.isInUse &&
      chapterData.piece.tags[dimension] == true;
    const isActiveChapter =
      activeTab.data.book == book && activeTab.data.chapter == chapter;

    if (
      chapterData.isSelected &&
      isAnimatable &&
      !chapterData.piece.masks.isOnTheGround &&
      !isActiveChapter
    ) {
      chaptersToDeselect.push(chapterData);
    }
    if (isActiveChapter) {
      if (chapterData.parentDataIds.stackBibleId) {
        chapterToFocus = chapterData;
      } else {
        if (isAnimatable) {
          if (!chapterData.isSelected) {
            chapterSelectionAnimations.push(
              thisBot.TrySelectChapter({ info: { chapterData } })
            );
          }
        }
      }
    }
  });

  if (chapterToFocus) {
    const bookData = thisBot.vars.stackBooksData.find((currBookData) => {
      return currBookData.id === chapterToFocus.parentDataIds.stackBookId;
    });
    const sectionBookData = thisBot.vars.stackSectionBooksData.find(
      (sectionBookData) => {
        return (
          sectionBookData.id === chapterToFocus.parentDataIds.stackSectionBookId
        );
      }
    );
    const sectionData = thisBot.vars.stackSectionsData.find((data) => {
      return data.id === chapterToFocus.parentDataIds.stackSectionId;
    });
    const testamentData = thisBot.vars.stackTestamentsData.find((data) => {
      return data.id === chapterToFocus.parentDataIds.stackTestamentId;
    });
    const bibleData = thisBot.GetBibleDataById({
      stackBibleId: chapterToFocus.parentDataIds.stackBibleId,
    });
    const shouldResetStack =
      (!testamentData.isActive || testamentData.isSplitIntoSections) &&
      (sectionBookData
        ? !sectionBookData.isActive || sectionBookData.isSelected
        : (!sectionData.isActive || sectionData.isSplitIntoBooks) &&
          (!bookData.isActive || bookData.isSelected)) &&
      !chapterToFocus.isActive &&
      !chapterToFocus.parentDataIds.stackBibleId;

    const speedMultiplierConditions = [!testamentData.isSplitIntoSections];
    if (sectionBookData) {
      speedMultiplierConditions.push(!sectionBookData.isSelected);
    } else {
      speedMultiplierConditions.push(
        !sectionData.isSplitIntoBooks,
        !sectionData.isInExplodedView,
        !bookData.isSelected
      );
    }

    const speedMultiplier =
      shouldResetStack || speedMultiplierConditions.filter(Boolean).length > 1
        ? 2
        : 1;
    const getBookToDeselect = (currBookData) => {
      return (
        currBookData.id !== bookData.id &&
        currBookData.isSelected &&
        currBookData.lastInteractionSource ===
          BibleVizUtils.Data.tags.PieceDataSelectionSource
            .StackTabsVisualizationUpdate
      );
    };
    const bookToDeselectData =
      thisBot.vars.stackBooksData.find(getBookToDeselect) ??
      thisBot.vars.stackSectionBooksData.find(getBookToDeselect);

    const animation = (
      shouldResetStack
        ? thisBot.ResetBible({ bibleData, speedMultiplier })
        : bookToDeselectData
          ? thisBot.DeselectBook({ bookData: bookToDeselectData })
          : os.sleep(1)
    ).then(() => {
      if (thisBot.masks.isTabVizUpdateQueued) {
        return true;
      }

      return (
        testamentData.isSplitIntoSections
          ? os.sleep(1)
          : thisBot.SelectTestament({
              testament: testamentData.piece,
              speedMultiplier,
            })
      ).then(() => {
        if (thisBot.masks.isTabVizUpdateQueued) {
          return true;
        }

        return (
          sectionBookData
            ? sectionBookData.isSelected
              ? os.sleep(1)
              : thisBot.SelectBook({
                  book: sectionBookData.piece,
                  speedMultiplier,
                  source:
                    BibleVizUtils.Data.tags.PieceDataSelectionSource
                      .StackTabsVisualizationUpdate,
                })
            : sectionData.isSplitIntoBooks
              ? os.sleep(1)
              : thisBot.SelectSection({
                  section: sectionData.piece,
                  speedMultiplier,
                  skipTourGuide: true,
                })
        ).then(() => {
          if (thisBot.masks.isTabVizUpdateQueued) {
            return true;
          }

          return (
            sectionBookData || sectionData.isInExplodedView
              ? os.sleep(1)
              : thisBot.TrySetSectionAsExplodedView({
                  section: sectionData.piece,
                  speedMultiplier,
                })
          ).then(() => {
            if (thisBot.masks.isTabVizUpdateQueued) {
              return true;
            }

            return (
              sectionBookData || bookData.isSelected
                ? os.sleep(1)
                : thisBot.SelectBook({
                    book: bookData.piece,
                    speedMultiplier,
                    source:
                      BibleVizUtils.Data.tags.PieceDataSelectionSource
                        .StackTabsVisualizationUpdate,
                  })
            ).then(() => {
              if (thisBot.masks.isTabVizUpdateQueued) {
                return true;
              }

              return thisBot.TrySelectChapter({
                info: { chapterData: chapterToFocus },
              });
            });
          });
        });
      });
    });

    chapterSelectionAnimations.push(animation);
  }

  const allAnimations = [
    ...chapterSelectionAnimations,
    chaptersToDeselect.length > 0
      ? thisBot.DeselectChapter({
          info: chaptersToDeselect.map((chapterData) => {
            return { chapterData };
          }),
        })
      : null,
  ].filter(Boolean);

  return (
    allAnimations.length > 0 ? Promise.allSettled(allAnimations) : os.sleep(1)
  ).then(() => {
    setTagMask(thisBot, "isMakingTabsVizUpdate", false);
    if (thisBot.masks.isTabVizUpdateQueued) {
      thisBot.UpdateStackTabsVisualization({
        source: "UpdateStackTabsVisualization",
      });
    }
  });
}
