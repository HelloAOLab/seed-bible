import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { scriptureService } from "bibleVizUtils.services.index";
import { seedBiblePresenceProvider } from "bibleVizUtils.services.index";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { PieceSelectionSources } from "bibleVizUtils.models.canvas";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

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

const activeTab = seedBiblePresenceProvider.getActiveTab();

if (!activeTab) {
  console.warn("not active tab found at UpdateStackTabsVisualization");
  return;
}

const dimension = os.getCurrentDimension();
const chapterSelectionAnimations = [];
const chaptersToDeselect: StackChapterData[] = [];
let chapterToFocus: StackChapterData | undefined;

(thisBot.vars.stackChaptersData as StackChapterData[]).forEach(
  (chapterData) => {
    let book = chapterData.getCreationParam("bookName");
    let chapter = chapterData.getPieceInfoProperty("number");
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
      if (chapterData.getParentId("stackBibleId")) {
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
  }
);

if (chapterToFocus) {
  const {
    bibleData,
    testamentData,
    sectionData,
    sectionBookData,
    bookData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
    sectionBookData: StackSectionBookData | undefined;
    bookData: StackBookData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: chapterToFocus.parentDataIds,
  });
  const shouldResetStack =
    (!testamentData?.isActive || testamentData.isSplitIntoSections) &&
    (sectionBookData
      ? !sectionBookData.isActive || sectionBookData.isSelected
      : (!sectionData?.isActive || sectionData.isSplitIntoBooks) &&
        (!bookData?.isActive || bookData.isSelected)) &&
    !chapterToFocus.isActive &&
    !chapterToFocus.getParentId("stackBibleId");

  const speedMultiplierConditions = [!testamentData?.isSplitIntoSections];
  if (sectionBookData) {
    speedMultiplierConditions.push(!sectionBookData.isSelected);
  } else {
    speedMultiplierConditions.push(
      !sectionData?.isSplitIntoBooks,
      !sectionData?.isInExplodedView,
      !bookData?.isSelected
    );
  }

  const speedMultiplier =
    shouldResetStack || speedMultiplierConditions.filter(Boolean).length > 1
      ? 2
      : 1;
  const getBookToDeselect: (
    currBookData: StackBookData | StackSectionBookData
  ) => boolean = (currBookData) => {
    return !!(
      currBookData.id !== bookData?.id &&
      currBookData.isSelected &&
      currBookData.lastInteractionSource ===
        PieceSelectionSources.StackTabsVisualizationUpdate
    );
  };
  const bookToDeselectData =
    (thisBot.vars.stackBooksData as StackBookData[]).find(getBookToDeselect) ??
    (thisBot.vars.stackSectionBooksData as StackSectionBookData[]).find(
      getBookToDeselect
    );

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
      testamentData
        ? testamentData.isSplitIntoSections
          ? os.sleep(1)
          : thisBot.SelectTestament({
              testament: testamentData.piece,
              speedMultiplier,
              source: "UpdateStackTabsVisualization",
            })
        : os.sleep(1)
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
                source: PieceSelectionSources.StackTabsVisualizationUpdate,
              })
          : sectionData
            ? sectionData.isSplitIntoBooks
              ? os.sleep(1)
              : thisBot.SelectSection({
                  section: sectionData.piece,
                  speedMultiplier,
                  skipTourGuide: true,
                })
            : os.sleep(1)
      ).then(() => {
        if (thisBot.masks.isTabVizUpdateQueued) {
          return true;
        }

        return (
          sectionBookData || sectionData
            ? sectionData
              ? sectionData.isInExplodedView
                ? os.sleep(1)
                : thisBot.TrySetSectionAsExplodedView({
                    section: sectionData.piece,
                    speedMultiplier,
                  })
              : os.sleep(1)
            : os.sleep(1)
        ).then(() => {
          if (thisBot.masks.isTabVizUpdateQueued) {
            return true;
          }

          return (
            sectionBookData || bookData
              ? bookData
                ? bookData.isSelected
                  ? os.sleep(1)
                  : thisBot.SelectBook({
                      book: bookData.piece,
                      speedMultiplier,
                      source:
                        PieceSelectionSources.StackTabsVisualizationUpdate,
                    })
                : os.sleep(1)
              : os.sleep(1)
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
  allAnimations.length > 0 ? Promise.all(allAnimations) : os.sleep(1)
).then(() => {
  setTagMask(thisBot, "isMakingTabsVizUpdate", false);
  if (thisBot.masks.isTabVizUpdateQueued) {
    thisBot.UpdateStackTabsVisualization({
      source: "UpdateStackTabsVisualization",
    });
  }
});
