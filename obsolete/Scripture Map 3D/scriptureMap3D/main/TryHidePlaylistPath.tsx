import type { LayoutBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/LayoutBibleData";

const {
  layoutData,
}: {
  layoutData: LayoutBibleData;
} = that;

if (layoutData.currentPlaylistShownId && !layoutData.isPlaylistPathEnabled) {
  layoutData.playlistEntries?.forEach((entryItem) => {
    entryItem?.vars?.nodes?.forEach?.((node) => {
      setTag(node, "lineTo", null);
    });
  });
}
