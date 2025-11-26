const {mapData} = that

const dimension = os.getCurrentDimension();
const elements = [
    ...mapData.staticMapElements.testamentLines,
    ...mapData.staticMapElements.testamentLabels,
    ...mapData.staticMapElements.sectionLines,
    ...mapData.staticMapElements.sectionLabels
]

setTag(elements, dimension, true);

mapData.childrenStructures.forEach((mapBookStructure) => {
    setTag(mapBookStructure.dateLabel, "labelColor", mapBookStructure.dateLabel.tags.initialLabelcolor)
});