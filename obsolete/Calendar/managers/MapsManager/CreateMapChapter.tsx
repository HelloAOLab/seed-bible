import { ParentDataIds } from "managers.StacksManager.ParentDataIds";
import { MapChapterData } from "managers.MapsManager.MapChapterData";

const { chapterInfo, mapData, mapBookData } = that;
const parentDataIds = new ParentDataIds({
  mapId: mapData?.id,
  mapBookId: mapBookData?.id,
});
const chapterData = new MapChapterData({
  id: uuid(),
  elementInfo: chapterInfo,
  parentDataIds,
  originalMapId: mapData?.id,
});
thisBot.vars.mapChaptersData.push(chapterData);
return chapterData;
