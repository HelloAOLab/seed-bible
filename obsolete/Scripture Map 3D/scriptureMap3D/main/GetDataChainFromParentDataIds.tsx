const { parentDataIds } = that;
let layoutData, layoutBookData;

if (parentDataIds.layoutId)
  layoutData = thisBot.vars.layoutsData.find((data) => {
    return data.id == parentDataIds.layoutId;
  });
if (parentDataIds.layoutBookId)
  layoutBookData = thisBot.vars.layoutBooksData.find((data) => {
    return data.id == parentDataIds.layoutBookId;
  });
return { layoutData, layoutBookData };
