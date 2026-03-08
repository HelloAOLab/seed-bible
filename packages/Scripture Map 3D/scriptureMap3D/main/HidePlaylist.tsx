import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

setTagMask(thisBot, "isAnimatingBible", true);

const { layoutData } = that;

layoutData.playlistSelectedEntryIndex = 0;
layoutData.currentPlaylistShownId = null;
layoutData.playlistEntries = [];

await thisBot.RespawnAllBooks({ layoutData });

layoutData.childrenStructures.forEach((layoutBookStructure) => {
  if (layoutBookStructure.layoutBookData.piece) {
    const bookMod = { draggable: true };
    applyMod(layoutBookStructure.layoutBookData.piece, bookMod);
  }
});

if (layoutData.staticLayoutPieces.playlistPreviousButton) {
  ObjectPooler.ReleaseObject({
    obj: layoutData.staticLayoutPieces.playlistPreviousButton,
    tag: ObjectPoolTags.MapPlaylistNavigationButton,
  });
  layoutData.staticLayoutPieces.playlistPreviousButton = null;
}
if (layoutData.staticLayoutPieces.playlistNextButton) {
  ObjectPooler.ReleaseObject({
    obj: layoutData.staticLayoutPieces.playlistNextButton,
    tag: ObjectPoolTags.MapPlaylistNavigationButton,
  });
  layoutData.staticLayoutPieces.playlistNextButton = null;
}

shout("OnHidePlaylistComplete");
