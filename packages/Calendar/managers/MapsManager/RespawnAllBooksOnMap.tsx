setTagMask(thisBot, "isAnimatingMap", true);

const { mapData } = that;
const dimension = os.getCurrentDimension();
const respawnableBooksStructure = thisBot.vars.mapBooksStructure.filter(
  (mapBookStructure: any) => {
    return (
      !mapBookStructure.mapBookData.element ||
      mapBookStructure.mapBookData.isSelected
    );
  }
);
const bookShowDelay = 500;

const openAllBooksButton = mapData.staticMapElements.settingsButtons.find(
  (button: any) => {
    return button.tags.buttonType === MapButtonType.OpenAllBooksButton;
  }
);

openAllBooksButton.links.buttonIcon.tags.formAddress =
  openAllBooksButton.tags.openIcon;
openAllBooksButton.links.buttonLabel.tags.label = "Open all books";
mapData.hasSelectAllBooksBeenCalled = false;
for (let respawnableBookStructure of respawnableBooksStructure) {
  const activeChaptersData =
    respawnableBookStructure.mapBookData.childrenData.filter(
      (mapChapterData: any) => {
        return mapChapterData.element;
      }
    );
  if (activeChaptersData.length > 0) {
    const activeChapters = activeChaptersData.map((mapChapterData: any) => {
      return mapChapterData.element;
    });
    ObjectPooler.ReleaseObject({
      obj: activeChapters,
      tag: activeChapters[0].tags.poolTag,
    });
    activeChaptersData.forEach((mapChapterData: any) => {
      mapChapterData.ResetData();
    });
  }
  const mapBook = await thisBot.SpawnMapBook({
    mapData,
    mapBookStructure: respawnableBookStructure,
  });
  const nameLabelPosition = getBotPosition(
    respawnableBookStructure.nameLabel,
    dimension
  );

  const mapBookPositionMod = {
    [dimension + "X"]: nameLabelPosition.x,
    [dimension + "Y"]:
      nameLabelPosition.y -
      MapElementMeasurements.BookLabelHeight / 2 -
      mapBook.tags.scaleY / 2,
  };
  applyMod(mapBook, mapBookPositionMod);
}
await respawnableBooksStructure.sort(
  (structureA: any, structureB: any) =>
    structureA.mapBookData.element.tags.index -
    structureB.mapBookData.element.tags.index
);

await Promise.all(
  respawnableBooksStructure.map((mapBookStructure: any, index: any) => {
    return animateTag(mapBookStructure.mapBookData.element, {
      fromValue: {
        formOpacity: 0,
      },
      toValue: {
        formOpacity: 1,
      },
      duration: 0.007,
      startTime: os.localTime + bookShowDelay + index * 20,
    });
  })
);

shout("OnRespwnAllBooksOnMapComplete");

return;

// cover.ClearCurrentSelectedChapter();
