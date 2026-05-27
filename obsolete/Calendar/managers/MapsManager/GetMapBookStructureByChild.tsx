const {mapBookData, mapBookLabel} = that;

return thisBot.vars.mapBooksStructure.find((structure) => {
    return mapBookData ? structure.mapBookData.id == mapBookData.id : structure.nameLabel.id == mapBookLabel.id
});