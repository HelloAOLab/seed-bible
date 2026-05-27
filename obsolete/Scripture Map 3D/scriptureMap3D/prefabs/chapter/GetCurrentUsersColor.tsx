import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

const chapterData = await (ScriptureMap3DManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackChapterData | undefined>);

if (!chapterData) {
  throw new Error("GetCurrentUsersColor: chapterData not found.");
}

return getBots(
  byTag("isElementUserColor", true),
  byTag("ownerDataId", Number(chapterData.id)),
  byTag("isInUse", true)
);
