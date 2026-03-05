import { MapBookData } from "managers.MapsManager.MapBookData";
import { ParentDataIds } from "managers.StacksManager.ParentDataIds";

const { bookInfo, mapData, arrangementIndex, testamentIndex, sectionIndex } =
  that;
const parentDataIds = new ParentDataIds({ mapId: mapData?.id });
const creationInfo = { arrangementIndex, testamentIndex, sectionIndex };
const mapBookData = new MapBookData({
  id: uuid(),
  element: null,
  elementInfo: bookInfo,
  isSelected: false,
  parentDataIds,
  creationInfo,
});

let chaptersData = await Promise.all(
  StacksManager.tags.booksStaticInfo[bookInfo.commonName].chaptersInfo.map(
    (chapterInfo: any) => {
      return thisBot.CreateMapChapter({ chapterInfo, mapData, mapBookData });
    }
  )
);

chaptersData.forEach((chapterData: any) => {
  mapBookData.AddChild(chapterData);
});
thisBot.vars.mapBooksData.push(mapBookData);
return mapBookData;
