const { mapData, playlistInfo } = that;

if (!playlistInfo) return;

const { playlistId, startIndex, startSubIndex, parentId, name } = playlistInfo;

setTagMask(thisBot, "isAnimatingMap", true);

const dimension = os.getCurrentDimension();
mapData.currentPlaylistShownId = playlistId;
const playlistItemsList = playlistInfo.list.slice();
thisBot.HideCurrentMapBookDateLabelShown();

await thisBot.RespawnAllBooksOnMap({ mapData });

mapData.childrenStructures.forEach((mapBookStructure: any) => {
  if (mapBookStructure.mapBookData.element) {
    const bookMod = { draggable: false };
    applyMod(mapBookStructure.mapBookData.element, bookMod);
  }
});

const playlistEntryItemHeight = 0.25;

for (let playlistEntryInfoIndex in playlistItemsList) {
  const playlistEntryInfo = playlistItemsList[playlistEntryInfoIndex];

  switch (playlistEntryInfo.type) {
    case PlaylistItemType.Chapter:
    case PlaylistItemType.Verse:
      {
        const mapBookStructure = mapData.childrenStructures.find(
          (structure: any) => {
            return (
              structure.mapBookData.elementInfo.commonName ===
              playlistEntryInfo.additionalInfo[
                playlistEntryInfo.type === PlaylistItemType.Verse
                  ? "book"
                  : "bookName"
              ]
            );
          }
        );

        if (!mapBookStructure.mapBookData.isSelected) {
          const chaptersMod = { draggable: false };
          await thisBot.SelectMapBook({
            mapBookData: mapBookStructure.mapBookData,
            mapData,
            chaptersMod,
          });
        }
        const mapChapterData = mapBookStructure.mapBookData.childrenData.find(
          (data: any) => {
            return (
              data.elementInfo.number ===
              playlistEntryInfo.additionalInfo.chapter
            );
          }
        );

        const chapterPosition = getBotPosition(
          mapChapterData.element,
          dimension
        );

        let itemPositionZ =
          MapElementMeasurements.BookPositionZ +
          mapChapterData.playlistEntriesItems.length *
            (playlistEntryItemHeight +
              MapElementMeasurements.PlaylistStackedEntryItemGap);

        const entryItem = ObjectPooler.GetObjectFromPool({
          tag: ObjectPoolTags.MapChapterPlaylistEntryItem,
        });
        mapChapterData.AddEntryItem(entryItem);
        const index = mapData.playlistEntries.push(entryItem) - 1;
        const entryItemMod = {
          [dimension]: true,
          [dimension + "X"]: chapterPosition.x,
          [dimension + "Y"]: chapterPosition.y,
          [dimension + "Z"]: itemPositionZ,
          scaleX:
            MapElementMeasurements.ChapterWidth +
            MapElementMeasurements.PlaylistEntryItemPadding,
          scaleY:
            MapElementMeasurements.ChapterHeight +
            MapElementMeasurements.PlaylistEntryItemPadding,
          scaleZ: playlistEntryItemHeight,
          label: mapChapterData.element.tags.label,
          color:
            index < mapData.playlistSelectedEntryIndex
              ? "#D3D3D3"
              : index > mapData.playlistSelectedEntryIndex
                ? "#FFFFFF"
                : "#DCF0EC",
          strokeColor:
            index < mapData.playlistSelectedEntryIndex
              ? "#D3D3D3"
              : index > mapData.playlistSelectedEntryIndex
                ? "#FFFFFF"
                : "#139981",
          arrangementIndex:
            mapBookStructure.mapBookData.creationInfo.arrangementIndex,
          testamentIndex:
            mapBookStructure.mapBookData.creationInfo.testamentIndex,
          sectionIndex: mapBookStructure.mapBookData.creationInfo.sectionIndex,
          book: mapBookStructure.mapBookData.elementInfo.commonName,
          chapter: mapChapterData.elementInfo.number,
          index: playlistEntryInfoIndex,
          bookColumn: mapBookStructure.column,
          bookRow: mapBookStructure.row,
        };
        entryItem.OnSpawned({ mod: entryItemMod });
        entryItem.vars.nodes = [];
        if (index === mapData.playlistSelectedEntryIndex)
          mapData.playlistLastSelectedEntryItem = entryItem;
      }
      break;

    default:
      {
        mapData.playlistEntries.push(null);
      }
      break;
  }
}

thisBot.TryShowPlaylistPathOnMap({ mapData });

const coverPosition = getBotPosition(
  mapData.staticMapElements.cover,
  dimension
);
const coverScales = GetBotScales(mapData.staticMapElements.cover);

let prevButton =
  mapData.staticMapElements.playlistPreviousButton ??
  ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.MapPlaylistNavigationButton,
  });
let nextButton =
  mapData.staticMapElements.playlistNextButton ??
  ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.MapPlaylistNavigationButton,
  });

const prevButtonMod = {
  label: "<",
  scaleX: prevButton.tags.scaleX,
  scaleY: prevButton.tags.scaleY,
  scaleZ: prevButton.tags.scaleZ,
  [dimension]: true,
  [dimension + "X"]:
    coverPosition.x - coverScales.x / 2 + prevButton.tags.scaleX / 2,
  [dimension + "Y"]:
    coverPosition.y -
    coverScales.y / 2 -
    MapElementMeasurements.PlaylistNavigationButtonVerticalGap -
    prevButton.tags.scaleY / 2,
  [dimension + "Z"]: 0,
  navigationValue: -1,
  mapId: mapData.id,
};

const nextButtonMod = {
  space: "tempLocal",
  label: ">",
  scaleX: prevButton.tags.scaleX,
  scaleY: prevButton.tags.scaleY,
  scaleZ: prevButton.tags.scaleZ,
  [dimension]: true,
  [dimension + "X"]:
    coverPosition.x + coverScales.x / 2 - prevButton.tags.scaleX / 2,
  [dimension + "Y"]:
    coverPosition.y -
    coverScales.y / 2 -
    MapElementMeasurements.PlaylistNavigationButtonVerticalGap -
    prevButton.tags.scaleY / 2,
  [dimension + "Z"]: 0,
  navigationValue: 1,
  mapId: mapData.id,
};

prevButton.OnSpawned({ mod: prevButtonMod });
nextButton.OnSpawned({ mod: nextButtonMod });

mapData.staticMapElements.playlistPreviousButton = prevButton;
mapData.staticMapElements.playlistNextButton = nextButton;

shout("OnShowPlaylistOnMapComplete");
