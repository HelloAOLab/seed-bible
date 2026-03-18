import { GetCamRotationFocusPoint } from "bibleVizUtils.functions.index";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import {
  type PieceSelectionSource,
  PieceSelectionSources,
} from "bibleVizUtils.models.canvas";

/**
 * This tag handles a book selection. It modify the data of the selected book on the bibleStructure
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.book - The book to select
 * @example
 * thisBot.SelectBook({book})
 */

const {
  book,
  setBibleAnimating = true,
  speedMultiplier = 1,
  source = PieceSelectionSources.Unknown,
}: {
  book: Bot;
  setBibleAnimating?: boolean;
  speedMultiplier?: number;
  source?: PieceSelectionSource;
} = that;
const bookData: StackBookData | undefined = await thisBot.GetPieceData({
  piece: book,
});

if (!bookData) {
  console.error("bookData not found at SelectBook");
  return;
}

thisBot.vars.lastInteractedStackBookData = bookData;
const dimension = os.getCurrentDimension();
if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);
tryHideNotification(book);
await thisBot.TryUnhighlightPiece({
  piece: book,
  tryUpdateActivityNotification: false,
  requestSource: BibleVizUtils.Data.tags.InteractionType.Transition,
});

bookData.select();
bookData.changeLastInteractionSource(source);
shout("OnBiblePieceSelected", { piece: book });
setTagMask(book, "pointable", false);
setTagMask(book, "highlightable", false);
const focusOnRotation = { x: 1.01229, y: 0.5 };
const cameraFocusDuration = 1 / speedMultiplier;

const bookPosition = getBotPosition(book, dimension);
const { selectedBookHeight }: { selectedBookHeight: number | undefined } =
  await thisBot.ComputeSelectedBookLayout({
    data: bookData,
  });

if (!selectedBookHeight) {
  console.error(`selectedBookHeight not found at SelectBook`);
  return;
}

let fixedPosition = new Vector3(
  bookPosition.x,
  bookPosition.y,
  bookPosition.z + selectedBookHeight / 2
);
if (
  bookData.getParentId("stackBibleId") &&
  bookData.piece &&
  bookData.piece.links.transformerLink &&
  !Array.isArray(bookData.piece.links.transformerLink)
) {
  const transformerPosition = getBotPosition(
    bookData.piece.links.transformerLink,
    dimension
  );
  fixedPosition = fixedPosition.add(transformerPosition);
}
const desiredFocusOnPosition = GetCamRotationFocusPoint({
  theta: focusOnRotation.y,
  phi: focusOnRotation.x,
  botPosition: fixedPosition,
});

os.focusOn(
  { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
  {
    duration: cameraFocusDuration,
    easing: { type: "sinusoidal", mode: "inout" },
    rotation: focusOnRotation,
    zoom: 8,
  }
);

await thisBot.UpdateStacks({ speedMultiplier });

// if(globalThis?.OpenBibleAt === undefined){
//     shout("runThePage")
//     await os.sleep(1000);
// }
// OpenBibleAt(`${book.tags.bookName} ${1}:0`)
if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
thisBot.UpdateStackPiecesActivityNotification();
shout("OnStackBookSelectionComplete", { book });
thisBot.PlaySound({ soundName: "BookSelect" });
