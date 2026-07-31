const th = that;

return th.map((item: any) => {
  const skip = thisBot.checkIfNeedToSkip({ dataItem: item });
  return {
    ...item,
    greyOut: skip,
  };
});
