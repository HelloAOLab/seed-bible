import { GetBotScales } from "bibleVizUtils.functions.index";
import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
import { subtractArrays } from "bibleVizUtils.functions.index";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { Bot, Easing } from "../../../../typings/AuxLibraryDefinitions";

/**
 * This function handles the deselection and animation of a section,
 * resetting the visual state and attributes of the section and its children pieces.
 *
 * @param {Object} that - Object that contains important data for the function.
 * @param {StackSectionData} that.sectionData - Data related to the section being deselected, including children pieces and animations.
 * @returns {Promise<void>} - Resolves when the deselection and animation process completes.
 * @throws {Error} - Throws an error if any animation or state update fails.
 * @example
 * thisBot.DeselectSection({sectionData: someSectionData})
 */

const { sectionData }: { sectionData: StackSectionData } = that;

if (!sectionData.shadow) {
  throw new Error("Section shadow not defined at DeselectSection");
}

setTagMask(thisBot, "isBibleAnimating", true);
const dimension = os.getCurrentDimension();
const sectionShadowPosition = getBotPosition(sectionData.shadow, dimension);
const sectionDesiredScale = 1;
const sectionDesiredFormOpacity = 1;
const duration = 0.5;
const easing: Easing = { type: "sinusoidal", mode: "inout" };
const infoLabelTransformer = LabelsRepository.getLabelTransformerByOwner(
  sectionData.shadow
);
const selectedBooksData = sectionData.getActivelySelectedBooks();

thisBot.vars.lastInteractedStackSectionData = sectionData;

if (thisBot.vars.highlightedPieces.length > 0) {
  // TODO: Fix LoD below
  const piecesToUnhighlight: Bot[] = sectionData.childrenData
    .flat()
    .filter((bookData) => {
      return (
        bookData.isActive &&
        bookData.piece &&
        (thisBot.vars.highlightedPieces as Bot[]).some((piece) => {
          return piece.id === bookData.piece?.id;
        })
      );
    })
    .map((bookData) => {
      return bookData.piece as Bot;
    });
  if (piecesToUnhighlight.length > 0) {
    await Promise.all(
      piecesToUnhighlight.map((piece) => {
        return thisBot.TryUnhighlightPiece({
          piece,
          requestSource: BibleVizUtils.Data.tags.InteractionType.Transition, // TODO: Implement actual enum for InteractionType
        });
      })
    );
    thisBot.vars.highlightedPieces = subtractArrays(
      thisBot.vars.highlightedPieces,
      piecesToUnhighlight
    );
  }
}
if (selectedBooksData.length > 0) {
  selectedBooksData.forEach((bookData) => {
    bookData.deselect();
    if (bookData.piece) {
      setTagMask(bookData.piece, "pointable", true);
      setTagMask(bookData.piece, "highlightable", true);
    } else console.warn("actively selected book is missing piece");
  });
  await thisBot.UpdateStacks();
}
const sectionShadowScales = GetBotScales(sectionData.shadow);
const sectionInitialScales = {
  x: sectionShadowScales.x * 1.1,
  y: sectionShadowScales.y * 1.1,
  z: sectionShadowScales.z * 1.1,
};
const deltaScaleZ = sectionInitialScales.z - sectionShadowScales.z;
const sectionInitialPosition = new Vector3(
  sectionShadowPosition.x,
  sectionShadowPosition.y,
  sectionShadowPosition.z - deltaScaleZ / 2
);

if (!sectionData.piece) {
  throw new Error("sectionData.piece not found at DeselectSection");
}

setTagMask(sectionData.piece, dimension + "X", sectionInitialPosition.x);
setTagMask(sectionData.piece, dimension + "Y", sectionInitialPosition.y);
setTagMask(sectionData.piece, dimension + "Z", sectionInitialPosition.z);
setTagMask(sectionData.piece, "scale", sectionDesiredScale);
setTagMask(sectionData.piece, "scaleX", sectionInitialScales.x);
setTagMask(sectionData.piece, "scaleY", sectionInitialScales.y);
setTagMask(sectionData.piece, "scaleZ", sectionInitialScales.z);
// setTag(sectionData.piece, dimension, true);
setTagMask(
  sectionData.piece,
  "color",
  BibleVizUtils.Data.masks.isInHistoryMode
    ? BibleVizUtils.Functions.GetHistoryColor({ piece: sectionData.piece })
    : (sectionData.highlightColor ?? sectionData.pieceInfo.color)
);
setTagMask(sectionData.piece, "pointable", true);

await animateTag(sectionData.piece, {
  fromValue: {
    [dimension + "Z"]: sectionInitialPosition.z,
    scaleX: sectionInitialScales.x,
    scaleY: sectionInitialScales.y,
    scaleZ: sectionInitialScales.z,
    formOpacity: sectionData.piece.tags.formOpacity,
  },
  toValue: {
    [dimension + "Z"]: sectionShadowPosition.z,
    scaleX: sectionShadowScales.x,
    scaleY: sectionShadowScales.y,
    scaleZ: sectionShadowScales.z,
    formOpacity: sectionDesiredFormOpacity,
  },
  duration,
  easing,
});

if (infoLabelTransformer)
  await infoLabelTransformer.Hide().then(() => {
    ObjectPooler.ReleaseObject({
      obj: infoLabelTransformer,
      tag: infoLabelTransformer.tags.poolTag,
    });
  });

const piecesToRelease = sectionData.resetHierarchy(false);
console.log(`[Debug] DeselectSection`, {
  piecesToRelease: piecesToRelease.map((piece) => {
    return { ...piece, tags: { ...piece.tags } };
  }),
});
for (const piece of piecesToRelease) {
  ObjectPooler.ReleaseObject({
    obj: piece,
    tag: piece.tags.poolTag,
  });
}

await thisBot.UpdateStacks();
setTagMask(thisBot, "isBibleAnimating", false);

// BibleVizUtils.Functions.UpdateActivityNotificationOnPieces({piecesData: [sectionData], manager: thisBot})
