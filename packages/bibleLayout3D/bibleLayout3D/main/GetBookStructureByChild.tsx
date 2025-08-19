const {layoutBookData, mapBookLabel} = that;

return thisBot.vars.layoutBooksStructure.find((structure) => {
    return layoutBookData ? structure.layoutBookData.id == layoutBookData.id : structure.nameLabel.id == mapBookLabel.id
});