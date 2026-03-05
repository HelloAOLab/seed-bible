let { userColor } = that;
const {
  baseColor,
  reading,
  range,
  fullColorTimeSeconds = 900, // 15 minutes default
  step,
  stepColors,
} = that;

const nowInSeconds = Date.now() / 1000;

const readingTimeSeconds = reading.reduce((acc: any, event) => {
  const clampedReading = {
    start: Math.min(Math.max(event.start, range.start), range.end),
    end: Math.min(Math.max(event.end ?? nowInSeconds, range.start), range.end),
  };
  const entryReadingTime = clampedReading.end - clampedReading.start;
  return acc + entryReadingTime;
}, 0);

let progress = Math.min(1, readingTimeSeconds / fullColorTimeSeconds);

if (step && stepColors) {
  progress = RoundToStep(progress, step);
  const index = progress / step;
  userColor = stepColors[index];
  return userColor;
}

const baseColorRgb = BibleVizUtils.Functions.HexToRgb({ hexColor: baseColor });
const userColorRgb = BibleVizUtils.Functions.HexToRgb({ hexColor: userColor });

const deltaColor = [
  userColorRgb[0] - baseColorRgb[0],
  userColorRgb[1] - baseColorRgb[1],
  userColorRgb[2] - baseColorRgb[2],
];
const colorToAdd = [
  deltaColor[0] * progress,
  deltaColor[1] * progress,
  deltaColor[2] * progress,
];
const finalColor = ClampRGBColor([
  baseColorRgb[0] + colorToAdd[0],
  baseColorRgb[1] + colorToAdd[1],
  baseColorRgb[2] + colorToAdd[2],
]);
const finalColorHex = thisBot.RgbToHex({ rgbColor: finalColor });

return finalColorHex;

function ClampRGBColor(colorToClamp: any) {
  const colorClamped = [
    Math.max(Math.min(Math.round(colorToClamp[0]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[1]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[2]), 255), 0),
  ];
  return colorClamped;
}

function RoundToStep(value: any, step = 0.25) {
  return Math.round(value / step) * step;
}
