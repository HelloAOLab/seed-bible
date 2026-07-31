import type { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";

let { layoutBookData } = that; // TODO: Type this
const { book } = that; // TODO: Type this
if (!layoutBookData)
  layoutBookData = await (thisBot.GetPieceData({ piece: book }) as Promise<
    LayoutBookData | undefined
  >);

if (!layoutBookData) {
  throw new Error("TryhideUsersOnBook: layoutBookData not found.");
}

const currUsersColor = thisBot.GetUsersColorOnlayoutBook({ layoutBookData });
currUsersColor.forEach((userColor) => {
  ObjectPooler.ReleaseObject({ obj: userColor, tag: userColor.tags.poolTag });
});
