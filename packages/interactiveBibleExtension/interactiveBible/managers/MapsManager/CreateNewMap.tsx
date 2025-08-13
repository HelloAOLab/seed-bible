import {MapData} from 'interactiveBible.managers.MapsManager.MapData'

const {position} = that;

const mapData = new MapData({id: uuid()});
const {mapBookStructures, staticMapElements, amountOfRows, sectionLinesInfo, testamentLinesInfo } = await thisBot.CreateMapStructure({mapData});

mapBookStructures.forEach((mapBookStructure) => {mapData.AddChild(mapBookStructure)});
mapData.amountOfRows = amountOfRows
mapData.sectionLinesInfo = sectionLinesInfo;
mapData.testamentLinesInfo = testamentLinesInfo;
mapData.staticMapElements = staticMapElements;
thisBot.vars.mapsData.push(mapData);
thisBot.SetUpMap({mapData, position});

return {mapData}