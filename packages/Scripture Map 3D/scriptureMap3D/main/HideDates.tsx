const { layoutData } = that;

const dimension = os.getCurrentDimension();

layoutData.childrenStructures.forEach((layoutBookStructure) => {
  layoutBookStructure.dateLabel.tags[dimension] = false;
});
