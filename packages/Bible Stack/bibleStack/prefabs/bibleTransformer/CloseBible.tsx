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
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";

const {
  duration = 0.5,
  easing = { type: "sinusoidal", mode: "inout" },
  bibleData,
}: {
  bibleData: StackBibleData;
} = that ?? {};

if (!bibleData) {
  console.warn("bibleData not defined at CloseBible");
  return;
}
shout("OnStackBibleClose");

const dimension = os.getCurrentDimension();
const testaments = bibleData.childrenData
  .filter((testamentData) => {
    return testamentData.isActive && !testamentData.isSplitIntoSections;
  })
  .map((testamentData) => {
    return testamentData.piece;
  });
const sectionsData = bibleData.childrenData
  .filter((testamentData) => {
    return testamentData.isSplitIntoSections;
  })
  .flatMap((testamentData) => {
    return testamentData.childrenData;
  })
  .filter((sectionData) => {
    return sectionData.isActive && !sectionData.isSplitIntoBooks; // TODO: Fix this typing issue
  });
const sections = sectionsData.map((sectionData) => {
  return sectionData.piece;
});
const booksData = (
  bibleData.childrenData
    .filter((testamentData) => {
      return testamentData.isSplitIntoSections;
    })
    .flatMap((testamentData) => {
      return testamentData.childrenData;
    })
    .filter((sectionData) => {
      return (
        sectionData instanceof StackSectionData && sectionData.isSplitIntoBooks
      );
    }) as StackSectionData[]
)
  .flatMap((sectionData) => {
    return sectionData.childrenData;
  })
  .flat()
  .filter((bookData) => {
    return bookData.isActive;
  });
const books = booksData.map((bookData) => {
  return bookData.piece;
});
const sectionShadows = bibleData.childrenData
  .flatMap((testamentData) => {
    return testamentData.childrenData;
  })
  .filter((sectionData) => {
    return (
      sectionData instanceof StackSectionData &&
      sectionData.isActive &&
      sectionData.shadow
    );
  })
  .map((sectionData) => {
    return sectionData.shadow;
  });
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
const selectedBooksLabelTransformers = [
  ...booksData.filter((bookData) => {
    return bookData.isSelected && bookData.piece;
  }),
  ...sectionsData.filter((sectionData) => {
    return (
      sectionData instanceof StackSectionBookData &&
      sectionData.isSelected &&
      sectionData.piece
    );
  }),
]
  .map((selectedBookData) => {
    return getBot(
      byTag("isInfoLabelTransformer", true),
      byTag("ownerBotId", getID(selectedBookData.piece)),
      byTag("isInUse", true)
    );
  })
  .filter(Boolean);

shout("HideChapters", { bibleId: bibleData.id });
setTagMask(bibleElements, "pointable", false);

await Promise.allSettled([
  ...bibleElements.map((bibleElement) => {
    return BibleStackManager.TryUnhighlightPiece({
      piece: bibleElement,
      requestSource: BibleVizUtils.Data.tags.InteractionType.Transition,
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
          if (!piece) return Promise.resolve();
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
