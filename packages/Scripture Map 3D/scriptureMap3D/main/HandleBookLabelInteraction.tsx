import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { LayoutBookStructure } from "bibleVizUtils.models.canvas";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

const { bookLabel }: { bookLabel: Bot } = that;
const dimension = os.getCurrentDimension();

if (thisBot.masks.isAnimatingBible) return;

const layoutBookStructure: LayoutBookStructure | undefined =
  await thisBot.GetBookStructureByChild({ bookLabel });

if (!layoutBookStructure) {
  throw new Error(
    "layoutBookStructure not found at HandleBookLabelInteraction"
  );
}

const layoutData: LayoutBibleData | undefined = await thisBot.GetLayoutDataById(
  {
    layoutId: layoutBookStructure.layoutId,
  }
);

if (!layoutData) {
  throw new Error("layoutData not found at HandleBookLabelInteraction");
}

if (
  layoutBookStructure.layoutBookData.piece &&
  (!layoutBookStructure.layoutBookData.isSelected ||
    layoutData.currentPlaylistShownId)
) {
  console.warn("book label is not interactable at HandleBookLabelInteraction");
  return;
}

const activeChaptersData =
  layoutBookStructure.layoutBookData.childrenData.filter((chapterData) => {
    return chapterData.piece;
  });
if (activeChaptersData.length > 0) {
  for (const chapterData of activeChaptersData) {
    const itemsToRelease = chapterData.resetData();
    for (const item of itemsToRelease) {
      ObjectPooler.ReleaseObject({
        obj: item,
        tag: item.tags.poolTag,
      });
    }
  }
}
const nameLabelPosition = getBotPosition(
  layoutBookStructure.nameLabel,
  dimension
);

const book: Bot | undefined = await thisBot.SpawnBook({
  layoutData,
  layoutBookStructure,
});

if (!book) {
  throw new Error("book not found at HandleBookLabelInteraction");
}

const bookPositionMod = {
  [dimension + "X"]: nameLabelPosition.x,
  [dimension + "Y"]:
    nameLabelPosition.y -
    BibleVizDataRepository.getBibleLayoutMeasurement("BookLabelHeight") / 2 -
    book.tags.scaleY / 2,
};
applyMod(book, bookPositionMod);

await animateTag(layoutBookStructure.layoutBookData.piece as Bot, {
  fromValue: {
    formOpacity: 0,
  },
  toValue: {
    formOpacity: 1,
  },
  duration: 0.007,
});
thisBot.UserPresenceUpdate();
