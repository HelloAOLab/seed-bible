import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { LayoutChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/LayoutChapterData";

const {
  chapter,
  typeOfInteraction,
}: {
  chapter: Bot;
  typeOfInteraction: CanvasInteraction;
} = that;
const chapterData = await (thisBot.GetPieceData({ piece: chapter }) as Promise<
  LayoutChapterData | undefined
>);

if (!chapterData) {
  throw new Error("HandleChapterInteraction: chapterData not found.");
}

const originalLayoutData = thisBot.GetLayoutDataById({
  layoutId: chapterData.originalLayoutId,
});

if (originalLayoutData?.currentPlaylistShownId) return;

switch (typeOfInteraction) {
  case CanvasInteractions.Click:
    {
      if (!thisBot.masks.isAnimatingBible) {
        if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
          BibleVizUtils.Functions.HighlightBiblePiece({ data: chapterData });
        } else {
          if (!chapter.masks.isSelecting && !chapter.masks.isDeselecting) {
            if (chapterData.isSelected) {
              thisBot.DeselectChapter({
                chapterData,
                layoutData: originalLayoutData,
              });
            } else {
              thisBot.TrySelectChapter({
                chapterData,
                layoutData: originalLayoutData,
              });
            }
          }
        }
      }
    }
    break;
  case CanvasInteractions.HoverBegin:
    {
      thisBot.TryHighlightChapter({ chapterData });
    }
    break;
  case CanvasInteractions.HoverEnd:
    {
      thisBot.TryUnhighlightChapter({ chapterData });
    }
    break;
  case CanvasInteractions.Drag:
    {
      shout(`OnLayoutPieceDrag`, { data: chapterData });
    }
    break;
  case CanvasInteractions.Drop:
    {
      setTagMask(chapter, "isBeingDragged", false);
      if (originalLayoutData.isChapterExpandEnabled) {
        (chapterData.isSelected
          ? thisBot.DeselectChapter({
              chapterData,
              layoutData: originalLayoutData,
            })
          : Promise.resolve()
        ).then(() => {
          thisBot.TrySelectChapter({
            chapterData,
            layoutData: originalLayoutData,
          });
        });
      } else {
        if (!chapterData.piece.masks.hovered) thisBot.UserPresenceUpdate();
      }
    }
    break;
  default:
    break;
}
