import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { updateIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";
import { BiblePieces } from "bibleVizUtils.models.canvas";
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
      BiblePieces.StackTestament ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePieces.StackSection ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePieces.StackSectionShadow ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePieces.StackBook ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BiblePieces.StackChapter)
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
