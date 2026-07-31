import { CanvasInteractions } from "bibleVizUtils.models.canvas";

// const {modality} = that;
shout("OnLayoutBookInteracted", {
  book: thisBot,
  typeOfInteraction: CanvasInteractions.Click,
});
