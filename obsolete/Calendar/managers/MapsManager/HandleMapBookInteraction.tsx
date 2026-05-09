const { mapBook, typeOfInteraction } = that;
const mapBookData = thisBot.GetMapElementData({ element: mapBook });
const mapData =
  mapBookData.parentDataIds && mapBookData.parentDataIds.mapId
    ? thisBot.GetMapDataById({ mapId: mapBookData.parentDataIds.mapId })
    : null;

if (mapData?.currentPlaylistShownId) return;

switch (typeOfInteraction) {
  case StackElementInteractionType.Click:
    {
      if (!thisBot.masks.isAnimatingMap) {
        if (InstanceManager.masks.isHighlightToolEnabled) {
          InstanceManager.HighlightBibleElement({ data: mapBookData });
        } else {
          if (!mapBookData.isSelected) {
            thisBot.SelectMapBook({ mapBookData, mapData });
          }
        }
      }
    }
    break;
  case StackElementInteractionType.Drag:
    {
      if (mapBook.tags.draggable)
        shout("OnMapElementDrag", { data: mapBookData });
    }
    break;
  case StackElementInteractionType.Drop:
    {
      shout("OnMapElementDrop", { element: book, dropInfo });
    }
    break;
  default:
    break;
}
