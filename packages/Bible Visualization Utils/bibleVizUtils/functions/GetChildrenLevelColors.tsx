const {sectionColorRGB, colorRange, levelsLength} = that;

const levelsColors = [];
const levelsColorRange = {
    min: [Math.max(sectionColorRGB[0] - colorRange, 0), Math.max(sectionColorRGB[1] - colorRange, 0), Math.max(sectionColorRGB[2] - colorRange, 0)],
    max: [Math.min(sectionColorRGB[0] + colorRange, 255), Math.min(sectionColorRGB[1] + colorRange, 255), Math.min(sectionColorRGB[2] + colorRange, 255)]
}
const deltaRed = Math.floor((levelsColorRange.max[0] - levelsColorRange.min[0]) / levelsLength);
const deltaGreen = Math.floor((levelsColorRange.max[1] - levelsColorRange.min[1]) / levelsLength);
const deltaBlue = Math.floor((levelsColorRange.max[2] - levelsColorRange.min[2]) / levelsLength);

for(let i = 0; i < levelsLength; i++)
{
    const levelColorRGB = [levelsColorRange.min[0] + (deltaRed * i), levelsColorRange.min[1] + (deltaGreen * i), levelsColorRange.min[2] + (deltaBlue * i)];
    const levelColorHex = thisBot.RgbToHex({rgbColor: levelColorRGB});
    levelsColors.push(levelColorHex);
}
return levelsColors