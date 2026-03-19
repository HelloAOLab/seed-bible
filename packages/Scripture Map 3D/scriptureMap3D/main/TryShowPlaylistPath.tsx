import type { LayoutBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/LayoutBibleData";

const {
  layoutData,
}: {
  layoutData: LayoutBibleData;
} = that;

if (layoutData.currentPlaylistShownId && layoutData.isPlaylistPathEnabled) {
  thisBot.ShowPlaylistPath({ layoutData });
}
