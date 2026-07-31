import type { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

const {
  chapterData,
  layoutData,
}: {
  chapterData: LayoutChapterData;
  layoutData: LayoutBibleData;
} = that;

if (!chapterData.piece) {
  throw new Error("chapterData.piece not defined at TrySelectChapter");
}

chapterData.select();
shout("OnBiblePieceSelected", { piece: chapterData.piece });
if (layoutData?.isPathEnabled) {
  if (
    layoutData.currentSelectedChapterData &&
    layoutData.currentSelectedChapterData.piece
  ) {
    layoutData.currentSelectedChapterData.piece.tags.lineTo =
      chapterData.piece.tags.id;
    layoutData.currentSelectedChapterData.piece.tags.lineWidth = 4;
    layoutData.currentSelectedChapterData.piece.tags.lineColor =
      layoutData.chapterSelectColor;
  }
  layoutData.selectChapterData(chapterData);
}
if (layoutData?.isCameraAnimationEnabled) {
  const dimension = os.getCurrentDimension();
  os.focusOn(
    {
      x: chapterData.piece.tags[dimension + "X"] + 1,
      y: chapterData.piece.tags[dimension + "Y"] + 1,
      z: 1.5,
    },
    { rotation: { x: 0.3, y: 0.3, z: 0 } }
  );
}
tryHideNotification(chapterData.piece);
return chapterData.piece.Select({ layoutData }).then(() => {
  shout("OnScriptureMap3DChapterSelected");
});
