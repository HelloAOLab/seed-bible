const now = new Date();
const msPerDay = 1000 * 60 * 60 * 24;
const defaultStep =
  1 /
  Math.floor(
    (now - BibleVizUtils.Data.masks.readingHistoryRecencyThresholdTimeSeconds) /
      msPerDay
  );

const { recencyTimeSeconds, baseColor, userColor, step = defaultStep } = that;

const nowSeconds = Math.floor(now / 1000);
const timeFrameSeconds =
  nowSeconds -
  BibleVizUtils.Data.masks.readingHistoryRecencyThresholdTimeSeconds;
const elapsedRecencySeconds = Math.max(
  recencyTimeSeconds -
    BibleVizUtils.Data.masks.readingHistoryRecencyThresholdTimeSeconds,
  0
);

let progress = Math.min(elapsedRecencySeconds / timeFrameSeconds, 1);

if (step) {
  progress = RoundToStep(Math.max(progress, step), step);
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
