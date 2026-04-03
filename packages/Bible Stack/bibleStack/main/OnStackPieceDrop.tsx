/**
 * Handles the dropping of a stack piece, updating its position and managing interactions based on the drop info.
 *
 * @param {Object} that - The context object containing the piece, data, and drop information.
 * @param {Object} that.piece - The piece being dropped.
 * @param {Object} that.data - The data associated with the piece being dropped.
 * @param {Object} that.dropEvent - Information about where the piece is being dropped.
 * @example
 * shout('OnStackPieceDrop', {data: someStackPieceData, piece: someStackPiece, dropEvent: someDropEvent});
 */

import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { BiblePiece } from "bibleVizUtils.models.canvas";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { DropEvent } from "bibleVizUtils.models.casualos";

const {
  piece,
  data,
  dropEvent,
}: {
  piece: Bot;
  data:
    | StackBookData
    | StackChapterData
    | StackSectionBookData
    | StackSectionData
    | StackTestamentData;
  dropEvent?: DropEvent;
} = that;
const dimension = os.getCurrentDimension();
const piecePosition = getBotPosition(piece, dimension);
let newPosition;
let justGrounded;
thisBot.PlaySound({ soundName: "StackPieceDrop" });
setTagMask(piece, "isBeingDragged", false);
if (!dropEvent?.to.bot && !piece.masks.isOnTheGround) {
  justGrounded = true;
  setTagMask(piece, "isOnTheGround", true);
  if (!(data instanceof StackChapterData))
    setTagMask(piece, "highlightable", true);
}
if (piece.tags.transformer) {
  const transformer = getBot(byID(piece.tags.transformer));
  const transformerPosition = getBotPosition(transformer, dimension);
  newPosition = piecePosition.add(transformerPosition);
  setTag(piece, "transformer", null);
  setTagMask(piece, dimension + "X", newPosition.x);
  setTagMask(piece, dimension + "Y", newPosition.y);
  setTagMask(piece, dimension + "Z", newPosition.z);
}
if (data instanceof StackChapterData && data.isSelected && justGrounded) {
  const { sectionBookData, bookData } =
    await thisBot.GetDataChainFromParentDataIds({
      parentDataIds: data.parentDataIds,
    });
  const actualData = bookData ?? sectionBookData;
  thisBot
    .DeselectChapter({ info: { chapterData: data }, setBibleAnimating: true })
    .then(() => {
      thisBot.TrySelectChapter({
        info: { chapterData: data },
        bookData: actualData,
      });
    });
} else {
  setTag(
    piece,
    "desiredPositionZ",
    newPosition ? newPosition.z : piecePosition.z
  );
  if (piece.masks.isBeingHovered) {
    thisBot.TryHighlightPiece({
      piece,
      highlightRequestSource: CanvasInteractions.Drop,
      typeOfPiece: BiblePiece.StackTestament,
    });
  }
}

switch (true) {
  case data instanceof StackTestamentData:
    thisBot.vars.lastInteractedStackTestamentData = data;
    break;
  case data instanceof StackSectionData:
    thisBot.vars.lastInteractedStackSectionData = data;
    break;
  case data instanceof StackBookData:
    thisBot.vars.lastInteractedStackBookData = data;
    break;
  default:
    break;
}
