import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { updateNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import { scriptureService } from "bibleVizUtils.services.index";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

/**
 * This tag is called whenever a chapter is interacted
 * It is in charge of managing whether to select, deselect, highlight, drag or drop a chapter if possible.
 * @param {Object} that - Object that contains important data for the function
 * @param {StackChapterData} that.chapterData - The chapterData that holds the reference to the chapter transformer, chapter front, chapter back, and some more important informati    * @param {ChapStringat.chaptypeOfInteractionhe Represents the type of interaction. Possible values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
 * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * shout("HandleChapterInteraction", {chapterData: someChapterData, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Click});
 */

const {
  chapterData,
  typeOfInteraction,
  dragInfo,
  dropInfo,
}: {
  chapterData: StackChapterData;
} = that;
const {
  sectionBookData,
  bookData,
}: {
  sectionBookData: StackSectionBookData | undefined;
  bookData: StackBookData | undefined;
} = await thisBot.GetDataChainFromParentDataIds({
  parentDataIds: chapterData.parentDataIds,
});
const actualData = sectionBookData ?? bookData;

if (thisBot.masks.isBibleAnimating) return;

if (!chapterData.piece) {
  console.error("chapterData.piece not defined at HandleChapterInteraction");
  return;
}

const bookName = chapterData.getCreationParam("bookName");
const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

if (!bookStaticInfo) {
  console.error(`bookStaticInfo not found at HandleChapterInteraction`);
  return;
}

switch (typeOfInteraction) {
  case BibleVizUtils.Data.tags.InteractionType.Click:
    {
      if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
        BibleVizUtils.Functions.HighlightBiblePiece({ data: chapterData });
      } else {
        if (chapterData.isSelected) {
          if (!actualData && !chapterData.piece.masks.isDeselecting) {
            thisBot.DeselectChapter({
              info: { chapterData },
              setBibleAnimating: true,
            });
          }
        } else {
          if (!chapterData.piece.masks.isSelecting) {
            if (chapterData.piece.masks.isOnTheGround) {
              thisBot
                .TrySelectChapter({
                  info: { chapterData },
                  bookData: actualData,
                })
                .then(() => {
                  thisBot.UserPresenceUpdate();
                });
            } else {
              const createNewTab = false;
              if (createNewTab) {
                let tab = thisBot.vars.tabsContext.tabs.find((currTab) => {
                  return (
                    currTab.data.book ===
                      chapterData.piece?.tags.parentBookName &&
                    currTab.data.chapter ==
                      chapterData.getPieceInfoProperty("number")
                  );
                });

                if (!tab) {
                  tab = {
                    id: uuid(),
                    taken: false,
                    data: {
                      use: "thePage",
                      type: "book",
                      book: bookName,
                      bookId: bookStaticInfo.abbreviation,
                      chapter: chapterData.pieceInfo.number,
                      translation: "BSB",
                    },
                  };
                  globalThis.AddTab(tab);
                }
                thisBot.vars.tabsContext.setActiveTab(tab.id);
                globalThis.UpdateTab(tab);
              } else {
                let bookId = bookStaticInfo.abbreviation;
                let chapter = chapterData.getPieceInfoProperty("number");

                if (bookName.includes("Psalms")) {
                  ({ chapter } =
                    scriptureService.convertDividedPsalmsToComplete({
                      book: bookName,
                      chapter,
                    }));
                  bookId = "PSA";
                }

                thisBot.vars.tabsContext.navFunctions?.open?.(bookId, chapter);
              }
            }
          }
        }
      }
    }
    break;
  case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
    {
      thisBot.TryHighlightChapter({ parentData: actualData, chapterData });
    }
    break;
  case BibleVizUtils.Data.tags.InteractionType.HoverEnd:
    {
      if (
        !chapterData.piece.masks.isBeingDragged //&&
        // chapterData.piece.masks.isOnTheGround     &&
        // !chapterData.piece.masks.isSelecting      &&
        // !chapterData.piece.masks.isDeselecting
      ) {
        chapterData.piece.Unhighlight({ chapterData }).then(() => {
          if (
            !chapterData.isSelected ||
            !chapterData.piece?.masks.isOnTheGround
          )
            updateNotification(
              chapterData,
              thisBot.tags.activityNotificationOffset,
              {
                x: thisBot.tags.activityNotificationScaleX,
                y: thisBot.tags.activityNotificationScaleY,
              }
            );
        });
      }
    }
    break;
  case BibleVizUtils.Data.tags.InteractionType.Drag:
    {
      if (chapterData.piece.tags.draggable)
        shout("OnStackPieceDrag", {
          data: chapterData,
          piece: chapterData.piece,
        });
    }
    break;
  case BibleVizUtils.Data.tags.InteractionType.Dragging:
    {
      if (chapterData.piece.tags.draggable)
        shout("OnStackPieceDragging", {
          piece: chapterData.piece,
          dragInfo,
          data: chapterData,
        });
    }
    break;
  case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
      if (chapterData.piece.tags.draggable)
        shout("OnStackPieceDrop", {
          data: chapterData,
          piece: chapterData.piece,
          dropInfo,
        });
    }
    break;
  default:
    break;
}
