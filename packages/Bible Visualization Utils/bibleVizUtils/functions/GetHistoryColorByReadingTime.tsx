let { userColor } = that;
const {
  baseColor,
  readingTimeSeconds,
  fullColorTimeSeconds = 900, // 15 minutes default
  step,
  stepColors,
} = that;

let progress = Math.min(1, readingTimeSeconds / fullColorTimeSeconds);

if (step) {
  progress = RoundToStep(Math.max(progress, step), step);
  if (stepColors) {
    const index = progress / step;
    userColor = stepColors[index];
    return userColor;
  }
}

const baseColorRgb = BibleVizUtils.Functions.HexToRgb({ hexColor: baseColor });
const userColorRgb = BibleVizUtils.Functions.HexToRgb({ hexColor: userColor });

const difference = [
  userColorRgb[0] - baseColorRgb[0],
  userColorRgb[1] - baseColorRgb[1],
  userColorRgb[2] - baseColorRgb[2],
];

const colorToAdd = [
  difference[0] * progress,
  difference[1] * progress,
  difference[2] * progress,
];

const finalColor = ClampRGBColor([
  baseColorRgb[0] + colorToAdd[0],
  baseColorRgb[1] + colorToAdd[1],
  baseColorRgb[2] + colorToAdd[2],
]);

const finalColorHex = thisBot.RgbToHex({ rgbColor: finalColor });

return finalColorHex;

function ClampRGBColor(colorToClamp) {
  const colorClamped = [
    Math.max(Math.min(Math.round(colorToClamp[0]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[1]), 255), 0),
    Math.max(Math.min(Math.round(colorToClamp[2]), 255), 0),
  ];
  return colorClamped;
}

function RoundToStep(value, step = 0.25) {
  return Math.round(value / step) * step;
}
