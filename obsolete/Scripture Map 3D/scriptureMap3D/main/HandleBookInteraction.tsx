import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import type { DropEvent } from "bibleVizUtils.models.casualos";

const {
  book,
  typeOfInteraction,
  dropEvent,
}: {
  book: Bot;
  typeOfInteraction: CanvasInteraction;
  dropEvent?: DropEvent;
} = that;
const layoutBookData = await (thisBot.GetPieceData({ piece: book }) as Promise<
  LayoutBookData | undefined
>);

if (!layoutBookData) {
  throw new Error("HandleBookInteraction: layoutBookData not found.");
}

const layoutData =
  layoutBookData.parentDataIds && layoutBookData.parentDataIds.layoutId
    ? thisBot.GetLayoutDataById({
        layoutId: layoutBookData.parentDataIds.layoutId,
      })
    : null;

if (layoutData?.currentPlaylistShownId) return;

switch (typeOfInteraction) {
  case CanvasInteractions.Click:
    {
      if (!thisBot.masks.isAnimatingBible) {
        if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
          BibleVizUtils.Functions.HighlightBiblePiece({ data: layoutBookData });
        } else {
          if (!layoutBookData.isSelected) {
            thisBot.SelectBook({ layoutBookData, layoutData });
          }
        }
      }
    }
    break;
  case CanvasInteractions.Drag:
    {
      if (book.tags.draggable)
        shout("OnLayoutPieceDrag", { data: layoutBookData });
    }
    break;
  case CanvasInteractions.Drop:
    {
      shout("OnLayoutPieceDrop", { piece: book, dropEvent });
    }
    break;
  default:
    break;
}
