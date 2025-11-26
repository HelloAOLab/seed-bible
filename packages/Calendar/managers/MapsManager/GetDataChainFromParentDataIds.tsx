const {parentDataIds} = that;
let mapData, mapBookData;

if(parentDataIds.mapId) mapData = thisBot.vars.mapsData.find((data) => {return data.id == parentDataIds.mapId})
if(parentDataIds.mapBookId) mapBookData = thisBot.vars.mapBooksData.find((data) => {return data.id == parentDataIds.mapBookId})
return {mapData, mapBookData};