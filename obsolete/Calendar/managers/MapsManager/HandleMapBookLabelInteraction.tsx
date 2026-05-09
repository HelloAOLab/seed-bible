const { mapBookLabel } = that;
const dimension = os.getCurrentDimension();

if (thisBot.masks.isAnimatingMap) return;

const mapBookStructure = thisBot.GetMapBookStructureByChild({ mapBookLabel });
const mapData = thisBot.GetMapDataById({ mapId: mapBookStructure.mapId });
if (
  !mapBookStructure.mapBookData.element ||
  (mapBookStructure.mapBookData.isSelected && !mapData.currentPlaylistShownId)
) {
  const activeChaptersData = mapBookStructure.mapBookData.childrenData.filter(
    (mapChapterData) => {
      return mapChapterData.element;
    }
  );
  if (activeChaptersData.length > 0) {
    const activeChapters = activeChaptersData.map((mapChapterData) => {
      return mapChapterData.element;
    });
    ObjectPooler.ReleaseObject({
      obj: activeChapters,
      tag: activeChapters[0].tags.poolTag,
    });
    activeChaptersData.forEach((mapChapterData) => {
      mapChapterData.ResetData();
    });
  }
  const nameLabelPosition = getBotPosition(
    mapBookStructure.nameLabel,
    dimension
  );

  const mapBook = thisBot.SpawnMapBook({ mapData, mapBookStructure });

  const mapBookPositionMod = {
    [dimension + "X"]: nameLabelPosition.x,
    [dimension + "Y"]:
      nameLabelPosition.y -
      MapElementMeasurements.BookLabelHeight / 2 -
      mapBook.tags.scaleY / 2,
  };
  applyMod(mapBook, mapBookPositionMod);

  animateTag(mapBookStructure.mapBookData.element, {
    fromValue: {
      formOpacity: 0,
    },
    toValue: {
      formOpacity: 1,
    },
    duration: 0.007,
  });
}
