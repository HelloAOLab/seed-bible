import {MapBookStructure} from "managers.MapsManager.MapBookStructure"

const { bookInfo, mapData, column, row, structureIndex, arrangementIndex, testamentIndex, sectionIndex } = that;

const mapBookData = await thisBot.CreateMapBook({bookInfo, mapData, arrangementIndex, testamentIndex, sectionIndex});
const nameLabel = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.MapBookNameLabel});
const dateLabel = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.MapBookDateLabel});

const mapBookNameLabelMod = {mapId: mapData.id};
nameLabel.OnSpawned({mod: mapBookNameLabelMod});
const mapBookDateWroteMod = {mapId: mapData.id};
dateLabel.OnSpawned({mod: mapBookDateWroteMod});


const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const {relativeDateRange} = StacksManager.tags.booksStaticInfo[bookInfo.commonName];
const historicalDateRange  = `${Math.abs(relativeDateRange.min)}${(relativeDateRange.min != relativeDateRange.max) ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`
const elapsedYearsRange = `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`


const mapBookStructure = new MapBookStructure({mapBookData, nameLabel, column, row, structureIndex, mapId: mapData.id, dateLabel, historicalDateRange, elapsedYearsRange})
thisBot.vars.mapBooksStructure.push(mapBookStructure);
return mapBookStructure;