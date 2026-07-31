import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { updateIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";
import { BiblePiece } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const availableChaptersData = (
  thisBot.vars.stackChaptersData as StackChapterData[]
).filter((chapterData) => {
  return (
    chapterData.piece &&
    chapterData.piece.tags.isInUse &&
    chapterData.piece.masks.isExpanded &&
    !chapterData.piece.masks.isDeselecting &&
    !chapterData.piece.masks.isSelecting
  );
});
const availableInfoLabelTransformers = getBots(
  byTag("isInfoLabelTransformer", true),
  byTag("isInUse", true)
).filter((labelTransformer) => {
  return (
    labelTransformer?.links?.ownerBot &&
    !Array.isArray(labelTransformer.links.ownerBot) &&
    labelTransformer.links.ownerBot.tags?.typeOfPiece &&
    (labelTransformer.links.ownerBot.tags.typeOfPiece ===
      BiblePiece.StackTestament ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePiece.StackSection ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePiece.StackSectionShadow ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePiece.StackBook ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePiece.StackChapter)
  );
});
const availablePiecesData = [...availableChaptersData];
const availablePieces = [
  ...availablePiecesData.map((pieceData) => {
    return pieceData.piece as Bot;
  }),
  ...availableInfoLabelTransformers,
];

updateIndicators(availablePieces);
