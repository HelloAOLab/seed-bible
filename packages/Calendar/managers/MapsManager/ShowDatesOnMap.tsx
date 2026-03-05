const { mapData } = that;

const dimension = os.getCurrentDimension();

mapData.childrenStructures.forEach((mapBookStructure: any) => {
  mapBookStructure.dateLabel.tags[dimension] = true;
});
