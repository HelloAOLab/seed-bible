import type { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

setTagMask(thisBot, "isAnimatingBible", true);

const {
  layoutData,
}: {
  layoutData: LayoutBibleData;
} = that;
layoutData.handleAllBooksSelected();

const openAllBooksButton = layoutData.staticLayoutPieces.settingsButtons?.find(
  (button) => {
    return (
      button.tags.buttonType ===
      BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton
    );
  }
);

if (!openAllBooksButton) {
  throw new Error("openAllBooksButton not found at SelectAllBooks");
}
if (
  !openAllBooksButton.links.buttonLabel ||
  Array.isArray(openAllBooksButton.links.buttonLabel)
) {
  throw new Error(
    "openAllBooksButton.links.buttonLabel must be prperly defined as a single bot"
  );
}
if (
  !openAllBooksButton.links.buttonIcon ||
  Array.isArray(openAllBooksButton.links.buttonIcon)
) {
  throw new Error(
    "openAllBooksButton.links.buttonIcon must be prperly defined as a single bot"
  );
}

openAllBooksButton.links.buttonLabel.tags.label = "Close all books";
openAllBooksButton.links.buttonIcon.tags.formAddress =
  openAllBooksButton.tags.closeIcon;

const unselectedBooksData = (
  thisBot.vars.layoutBooksData as LayoutBookData[]
).filter((bookData) => {
  return bookData.piece && !bookData.isSelected;
});
await unselectedBooksData.sort(
  (bookDataA, bookDataB) =>
    bookDataA.piece?.tags.index - bookDataB.piece?.tags.index
);

for (const bookData of unselectedBooksData) {
  await thisBot.SelectBook({
    layoutBookData: bookData,
    layoutData,
    fromOpenAllButton: true,
  });
}

shout("OnSelectAllBooksOnLayoutComplete");
