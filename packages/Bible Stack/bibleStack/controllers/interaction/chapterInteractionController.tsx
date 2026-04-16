import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { pieceDataRepository } from "bibleStack.services.index";
import type { BibleStackEvents } from "bibleStack.models.events";
import type { ChapterBot } from "bibleStack.models.stack";
import type { PieceRepository } from "bibleStack.services.PieceDataRepository";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { updateNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import { scriptureService } from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

const getChapterRepository = (chapter: ChapterBot): PieceRepository => {
  return {
    getTypeOfPiece: () => chapter.tags.typeOfPiece,
    getId: () => chapter.id,
  };
};

export async function HandleChapterClick({
  chapter,
}: BibleStackEvents["OnChapterClick"]) {
  const chapterData = pieceDataRepository.getPieceData(
    getChapterRepository(chapter)
  ) as StackChapterData | undefined;

  if (!chapterData) {
    throw new Error("handleChapterClick: chapterData not found.");
  }
  if (thisBot.masks.isBibleAnimating) return;

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

  const bookName = chapterData.getCreationParam("bookName");
  const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

  if (!bookStaticInfo) {
    throw new Error("handleChapterClick: bookStaticInfo not found");
  }

  if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
    BibleVizUtils.Functions.HighlightBiblePiece({ data: chapterData });
  } else {
    if (chapterData.isSelected) {
      if (!actualData && !chapter.masks.isDeselecting) {
        thisBot.DeselectChapter({
          info: { chapterData },
          setBibleAnimating: true,
        });
      }
    } else {
      if (chapter.masks.isSelecting) return;

      if (chapter.masks.isOnTheGround) {
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
              currTab.data.book === chapter?.tags.parentBookName &&
              currTab.data.chapter == chapterData.getPieceInfoProperty("number")
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
                translation: "AAB",
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
            ({ chapter } = scriptureService.convertDividedPsalmsToComplete({
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

export async function HandleChapterDrag({
  chapter,
}: BibleStackEvents["OnChapterDrag"]) {
  const chapterData = pieceDataRepository.getPieceData(
    getChapterRepository(chapter)
  ) as StackChapterData | undefined;

  if (!chapterData) {
    throw new Error("handleChapterClick: chapterData not found.");
  }
  if (thisBot.masks.isBibleAnimating || !chapter.tags.draggable) return;

  const bookName = chapterData.getCreationParam("bookName");
  const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

  if (!bookStaticInfo) {
    throw new Error("handleChapterClick: bookStaticInfo not found");
  }

  shout("OnStackPieceDrag", {
    data: chapterData,
    piece: chapter,
  });
}

export async function HandleChapterDragging({
  chapter,
  draggingEvent,
}: BibleStackEvents["OnChapterDragging"]) {
  const chapterData = pieceDataRepository.getPieceData(
    getChapterRepository(chapter)
  ) as StackChapterData | undefined;

  if (!chapterData) {
    throw new Error("handleChapterClick: chapterData not found.");
  }
  if (thisBot.masks.isBibleAnimating || !chapter.tags.draggable) return;

  const bookName = chapterData.getCreationParam("bookName");
  const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

  if (!bookStaticInfo) {
    throw new Error("handleChapterClick: bookStaticInfo not found");
  }

  shout("OnStackPieceDragging", {
    piece: chapter,
    draggingEvent,
    data: chapterData,
  });
}

export async function HandleChapterPointerEnter({
  chapter,
}: BibleStackEvents["OnChapterPointerEnter"]) {
  const chapterData = pieceDataRepository.getPieceData(
    getChapterRepository(chapter)
  ) as StackChapterData | undefined;

  if (!chapterData) {
    throw new Error("handleChapterClick: chapterData not found.");
  }
  if (thisBot.masks.isBibleAnimating) return;

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

  const bookName = chapterData.getCreationParam("bookName");
  const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

  if (!bookStaticInfo) {
    throw new Error("handleChapterClick: bookStaticInfo not found");
  }

  thisBot.TryHighlightChapter({ parentData: actualData, chapterData });
}

export async function HandleChapterPointerExit({
  chapter,
}: BibleStackEvents["OnChapterPointerExit"]) {
  const chapterData = pieceDataRepository.getPieceData(
    getChapterRepository(chapter)
  ) as StackChapterData | undefined;

  if (!chapterData) {
    throw new Error("handleChapterClick: chapterData not found.");
  }
  if (thisBot.masks.isBibleAnimating || chapter.masks.isBeingDragged) return;

  const bookName = chapterData.getCreationParam("bookName");
  const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

  if (!bookStaticInfo) {
    throw new Error("handleChapterClick: bookStaticInfo not found");
  }

  chapter.Unhighlight({ chapterData }).then(() => {
    if (!chapterData.isSelected || !chapter?.masks.isOnTheGround)
      updateNotification(chapterData, thisBot.tags.activityNotificationOffset, {
        x: thisBot.tags.activityNotificationScaleX,
        y: thisBot.tags.activityNotificationScaleY,
      });
  });
}

export async function HandleChapterDrop({
  chapter,
  dropEvent,
}: BibleStackEvents["OnChapterDrop"]) {
  const chapterData = pieceDataRepository.getPieceData(
    getChapterRepository(chapter)
  ) as StackChapterData | undefined;

  if (!chapterData) {
    throw new Error("handleChapterClick: chapterData not found.");
  }
  if (thisBot.masks.isBibleAnimating || !chapter.tags.draggable) return;

  const bookName = chapterData.getCreationParam("bookName");
  const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

  if (!bookStaticInfo) {
    throw new Error("handleChapterClick: bookStaticInfo not found");
  }

  shout("OnStackPieceDrop", {
    data: chapterData,
    piece: chapter,
    dropEvent,
  });
}
