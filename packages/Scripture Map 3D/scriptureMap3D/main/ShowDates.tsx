const { layoutData } = that;

const dimension = os.getCurrentDimension();

layoutData.childrenStructures.forEach((layoutBookStructure: any) => {
  layoutBookStructure.dateLabel.tags[dimension] = true;
});
