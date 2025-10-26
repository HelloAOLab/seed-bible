const {baseColor, userColor, reading, range} = that;

const readingTime = reading.reduce((acc, entry) => {
    const clampedReading = {
        start: Math.min(Math.max(entry.start, range.start), range.end),
        end: Math.min(Math.max(entry.end ?? Date.now(), range.start), range.end)
    }
    const entryReadingTime = (clampedReading.end - clampedReading.start);
    return acc + entryReadingTime;
}, 0)
const fullColorTime = 900000 // 15 minutes

const progress = Math.min(1, (readingTime * 10) / fullColorTime);

const baseColorRgb = BibleVizUtils.Functions.HexToRgb({hexColor: baseColor});
const userColorRgb = BibleVizUtils.Functions.HexToRgb({hexColor: userColor});

const deltaColor = [userColorRgb[0] - baseColorRgb[0], userColorRgb[1] - baseColorRgb[1], userColorRgb[2] - baseColorRgb[2]];
const colorToAdd = [deltaColor[0] * progress, deltaColor[1] * progress, deltaColor[2] * progress];
const finalColor = ClampRGBColor([baseColorRgb[0] + colorToAdd[0], baseColorRgb[1] + colorToAdd[1], baseColorRgb[2] + colorToAdd[2]]);
const finalColorHex = thisBot.RgbToHex({rgbColor: finalColor});

return finalColorHex

function ClampRGBColor(colorToClamp)
{
    const colorClamped = [
        Math.max(Math.min(Math.round(colorToClamp[0]), 255), 0),
        Math.max(Math.min(Math.round(colorToClamp[1]), 255), 0),
        Math.max(Math.min(Math.round(colorToClamp[2]), 255), 0)
    ]
    return colorClamped;
}