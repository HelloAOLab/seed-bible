const { mapData } = that;

const dimension = os.getCurrentDimension();

mapData.childrenStructures.forEach((mapBookStructure) => {
  mapBookStructure.dateLabel.tags[dimension] = false;
});
