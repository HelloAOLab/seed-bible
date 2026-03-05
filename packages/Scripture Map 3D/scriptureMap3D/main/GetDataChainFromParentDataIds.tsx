const { parentDataIds } = that;
let layoutData, layoutBookData;

if (parentDataIds.layoutId)
  layoutData = thisBot.vars.layoutsData.find((data: any) => {
    return data.id == parentDataIds.layoutId;
  });
if (parentDataIds.layoutBookId)
  layoutBookData = thisBot.vars.layoutBooksData.find((data: any) => {
    return data.id == parentDataIds.layoutBookId;
  });
return { layoutData, layoutBookData };
