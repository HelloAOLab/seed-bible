const {layoutData} = that

const dimension = os.getCurrentDimension();
const elements = [
    ...layoutData.staticLayoutElements.testamentLines,
    ...layoutData.staticLayoutElements.testamentLabels,
    ...layoutData.staticLayoutElements.sectionLines,
    ...layoutData.staticLayoutElements.sectionLabels
]

setTag(elements, dimension, true);

layoutData.childrenStructures.forEach((layoutBookStructure) => {
    setTag(layoutBookStructure.dateLabel, "labelColor", layoutBookStructure.dateLabel.tags.initialLabelcolor)
});