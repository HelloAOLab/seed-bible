import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { LayoutBookStructure } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

setTagMask(thisBot, "isAnimatingBible", true);

const {
  layoutData,
}: {
  layoutData: LayoutBibleData;
} = that;
const dimension = os.getCurrentDimension();
const respawnableBooksStructure = (
  thisBot.vars.layoutBooksStructure as LayoutBookStructure[]
).filter((layoutBookStructure) => {
  return (
    !layoutBookStructure.layoutBookData.piece ||
    layoutBookStructure.layoutBookData.isSelected
  );
});
const bookShowDelay = 500;

const openAllBooksButton = layoutData.staticLayoutPieces.settingsButtons?.find(
  (button) => {
    return (
      button.tags.buttonType ===
      BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton
    );
  }
);

if (!openAllBooksButton) {
  throw new Error("openAllBooksButton not found at RespawnAllBooks");
}
if (
  !openAllBooksButton.links.buttonIcon ||
  Array.isArray(openAllBooksButton.links.buttonIcon)
) {
  throw new Error("openAllBooksButton.links.buttonIcon not properly defined");
}
if (
  !openAllBooksButton.links.buttonLabel ||
  Array.isArray(openAllBooksButton.links.buttonLabel)
) {
  throw new Error("openAllBooksButton.links.buttonIcon not properly defined");
}

openAllBooksButton.links.buttonIcon.tags.formAddress =
  openAllBooksButton.tags.openIcon;
openAllBooksButton.links.buttonLabel.tags.label = "Open all books";
layoutData.clearAllBooksSelected();
for (const respawnableBookStructure of respawnableBooksStructure) {
  const activeChaptersData =
    respawnableBookStructure.layoutBookData.childrenData.filter(
      (chapterData) => {
        return chapterData.piece;
      }
    );
  if (activeChaptersData.length > 0) {
    for (const activeChapter of activeChaptersData) {
      const itemsToRelease = activeChapter.resetData();
      for (const item of itemsToRelease) {
        ObjectPooler.ReleaseObject({
          obj: item,
          tag: item.tags.poolTag,
        });
      }
    }
  }
  const book: Bot | undefined = await thisBot.SpawnBook({
    layoutData,
    layoutBookStructure: respawnableBookStructure,
  });

  if (!book) {
    throw new Error("book not found at RespawnAllBooks");
  }

  const nameLabelPosition = getBotPosition(
    respawnableBookStructure.nameLabel,
    dimension
  );

  const bookPositionMod = {
    [dimension + "X"]: nameLabelPosition.x,
    [dimension + "Y"]:
      nameLabelPosition.y -
      BibleVizDataRepository.getBibleLayoutMeasurement("BookLabelHeight") / 2 -
      book.tags.scaleY / 2,
  };
  applyMod(book, bookPositionMod);
}
await respawnableBooksStructure.sort(
  (structureA, structureB) =>
    structureA.layoutBookData.piece?.tags.index -
    structureB.layoutBookData.piece?.tags.index
);

await Promise.all(
  respawnableBooksStructure.map((layoutBookStructure, index) => {
    if (!layoutBookStructure.layoutBookData.piece) {
      throw new Error(
        "layoutBookStructure.layoutBookData.piece not found at RespawnAllBooks"
      );
    }
    return animateTag(layoutBookStructure.layoutBookData.piece, {
      fromValue: {
        formOpacity: 0,
      },
      toValue: {
        formOpacity: 1,
      },
      duration: 0.007,
      startTime: os.localTime + bookShowDelay + index * 20,
    });
  })
);

shout("OnRespawnAllBooksOnLayoutComplete");

return;

// cover.ClearCurrentSelectedChapter();
