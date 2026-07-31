import { GetBotScales } from "bibleVizUtils.functions.index";
import { DespawnLabelForPiece } from "bibleVizUtils.controllers.label.lifecycle";
/**
 * Gets the reference of the elements on the Bible and performs a close animation with a given duration and easing.
 * Currently active elements like Testaments, sections, Books, Upper cover, etc,
 * animates its scaleZ and position on the Z axis so the Bible looks like its closing
 *
 * @param {Object} that - Object that contains important data for the function
 * @param {Number} that.duration - The duration of the animation
 * @param {Object} that.easing - The easing of the animation
 * @param {String} that.easing.type - The type of easing
 * @param {String} that.easing.mode - The mode of easing
 * @example
 * thisBot.CloseBible({duration: 1, easing: {type: "sinusoidal", mode: "inout"}})
 */
import { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { Bot, Easing } from "../../../../../typings/AuxLibraryDefinitions";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackBookData";
import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";

const {
  duration = 0.5,
  easing = { type: "sinusoidal", mode: "inout" },
  bibleData,
}: {
  bibleData: StackBibleData;
  duration?: number;
  easing: Easing;
} = that ?? {};

if (!bibleData) {
  console.warn("bibleData not defined at CloseBible");
  return;
}
shout("OnStackBibleClose");

const dimension = os.getCurrentDimension();
const testaments: Bot[] = [];
const sectionsData: (StackSectionData | StackSectionBookData)[] = [];
const sections: Bot[] = [];
const booksData: StackBookData[] = [];
const books: Bot[] = [];
const sectionShadows: Bot[] = [];
const selectedBooks: Bot[] = [];
for (const testamentData of bibleData.childrenData) {
  if (testamentData.isSplitIntoSections) {
    for (const child of testamentData.childrenData) {
      if (child.isActive) {
        if (child instanceof StackSectionData && child.isSplitIntoBooks) {
          for (const bookData of child.childrenData.flat()) {
            if (bookData.isActive && bookData.piece) {
              booksData.push(bookData);
              books.push(bookData.piece);
              if (bookData.isSelected) {
                selectedBooks.push(bookData.piece);
              }
            }
          }
          if (child.shadow) {
            sectionShadows.push(child.shadow);
          }
        } else {
          if (child.piece) {
            sectionsData.push(child);
            sections.push(child.piece);
            if (child instanceof StackSectionBookData && child.isSelected) {
              selectedBooks.push(child.piece);
            }
          }
        }
      }
    }
  } else {
    if (testamentData.isActive && testamentData.piece) {
      testaments.push(testamentData.piece);
    }
  }
}
const lowerCover = bibleData.getStaticPiece("lowerCover");
const upperCover = bibleData.getStaticPiece("upperCover");
const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");

if (!lowerCover) {
  console.error("lowerCover not found at CloseBible");
  return;
}
const lowerCoverPosition = getBotPosition(lowerCover, dimension);
const lowerCoverScales = GetBotScales(lowerCover);
const upperCoverClosedPositionZ = lowerCoverPosition.z + lowerCoverScales.z;
const crossClosedPositionZ = upperCoverClosedPositionZ;
const bibleElements = testaments.concat(sections, books);
const elementsToShrink = bibleElements.concat(sectionShadows);
const desiredElementsScaleZ = 0;
const selectedBooksLabelTransformers = selectedBooks
  .map((book) => {
    return LabelsRepository.getLabelTransformerByOwner(book);
  })
  .filter(Boolean) as Bot[];

shout("HideChapters", { bibleId: bibleData.id });
setTagMask(bibleElements, "pointable", false);

await Promise.allSettled([
  ...bibleElements.map((bibleElement) => {
    return BibleStackManager.TryUnhighlightPiece({
      piece: bibleElement,
      requestSource: CanvasInteractions.Transition,
    });
  }),
  ...selectedBooksLabelTransformers.map((labelTransformer) => {
    return labelTransformer.Hide().then(() => {
      ObjectPooler.ReleaseObject({
        obj: labelTransformer,
        tag: labelTransformer.tags.poolTag,
      });
    });
  }),
]);

if (elementsToShrink.length > 0) {
  try {
    await Promise.all(
      elementsToShrink
        .map((piece) => {
          const elementPosition = getBotPosition(piece, dimension);
          const elementScales = GetBotScales(piece);
          return animateTag(piece, {
            fromValue: {
              [dimension + "Z"]: elementPosition.z,
              scaleZ: elementScales.z,
            },
            toValue: {
              [dimension + "Z"]: upperCoverClosedPositionZ,
              scaleZ: desiredElementsScaleZ,
            },
            duration,
            easing,
          });
        })
        .concat(
          upperCover
            ? animateTag(upperCover, dimension + "Z", {
                toValue: upperCoverClosedPositionZ,
                duration,
                easing,
              })
            : Promise.resolve(),
          verticalLine && horizontalLine
            ? animateTag([verticalLine, horizontalLine], dimension + "Z", {
                toValue: crossClosedPositionZ,
                duration,
                easing,
              })
            : Promise.resolve()
        )
    ).then(() => {
      setTagMask(thisBot, "isBibleClosed", true);

      elementsToShrink.forEach((piece) => {
        if (piece?.tags.OnReleased) {
          piece.OnReleased();
        } else {
          BibleStackManager.HideObject({ bot: piece });
        }
      });
      if (sectionShadows.length > 0) {
        sectionShadows.forEach((piece) => {
          DespawnLabelForPiece(piece);
          ObjectPooler.ReleaseObject({ obj: piece, tag: piece.tags.poolTag });
        });
      }
    });
  } catch (error) {
    console.error(error);
  }
}

return true;
