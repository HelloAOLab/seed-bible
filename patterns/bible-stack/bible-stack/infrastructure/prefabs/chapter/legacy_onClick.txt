import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import { ClickModalities } from "bibleVizUtils.infrastructure.models.casualos";
import { thisTypedBot } from "bibleStack.prefabs.chapter.botAdapter";
import { chapterInteractionController } from "bibleStack.infrastructure.di.bootstrap";

const { modality } = that;
chapterInteractionController?.handleChapterClick({
  chapter: thisTypedBot,
  interaction:
    modality === ClickModalities.touch
      ? CanvasInteractions.Tap
      : CanvasInteractions.Click,
});
