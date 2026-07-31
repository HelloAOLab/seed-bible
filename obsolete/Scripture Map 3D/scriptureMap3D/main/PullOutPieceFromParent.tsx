import { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import type { ParentDataId } from "bibleVizUtils.models.canvas";
const {
  pieceData,
  layoutData,
  layoutBookData,
}: {
  pieceData: LayoutBookData | LayoutChapterData;
  layoutData: LayoutBibleData | undefined;
  layoutBookData: LayoutBookData | undefined;
} = that;

if (!pieceData) {
  console.error("pieceData not defined at PullOutPieceFromParent");
  return;
}

if (!pieceData.piece) {
  console.error("pieceData.piece not defined at PullOutPieceFromParent");
  return;
}

const pieceDataCopy = await CreateDataCopy(pieceData);
pieceData.piece.tags.toErase = true;

const idsToNullify: ParentDataId[] = [];
switch (true) {
  case pieceData instanceof LayoutBookData:
    {
      idsToNullify.push("layoutId");
      layoutData?.replaceBookData(pieceData, pieceDataCopy as LayoutBookData);
    }
    break;
  case pieceData instanceof LayoutChapterData:
    {
      idsToNullify.push("layoutId", "layoutBookId");
      layoutBookData?.tryReplaceChild(
        pieceData,
        pieceDataCopy as LayoutChapterData
      );
    }
    break;
  default:
    break;
}
pieceData.clearParentIds(idsToNullify);

// TODO: Stack? Shouldn't be Layout?
return Promise.all(shout("OnStackPiecePulledOut"));

async function CreateDataCopy<T>(data: T): Promise<T> {
  let copy;
  switch (true) {
    case data instanceof LayoutBookData:
      {
        copy = await thisBot.CreateBook({
          bookInfo: data.pieceInfo,
          layoutData,
        });
      }
      break;
    case data instanceof LayoutChapterData:
      {
        copy = await thisBot.CreateChapter({
          chapterInfo: data.pieceInfo,
          layoutData,
          layoutBookData,
        });
      }
      break;
    default:
      break;
  }
  return copy;
}
