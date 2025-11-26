const { recencyTimeSeconds, baseColor, userColor } = that;

const sortedTimePeriods = (thisBot.vars.sortedTimePeriods ??=
  BibleVizUtils.Data.masks.historyTimePeriodsInfo.toSorted(
    (periodInfoA, periodInfoB) => {
      return periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs();
    }
  ));
const greaterTimePeriodSeconds =
  sortedTimePeriods[sortedTimePeriods.length - 1].GetTimePeriodInMs() / 1000;
const actualRecencyTimeSeconds = Math.min(
  recencyTimeSeconds,
  greaterTimePeriodSeconds
);
let timePeriodLowerIndex = -1;
let timePeriodUpperIndex = -1;

for (let i = 0; i < sortedTimePeriods.length - 1; i++) {
  const currTimePeriodSeconds = sortedTimePeriods[i].GetTimePeriodInMs() / 1000;
  const nextTimePeriodSeconds =
    sortedTimePeriods[i + 1].GetTimePeriodInMs() / 1000;
  if (
    actualRecencyTimeSeconds >= currTimePeriodSeconds &&
    actualRecencyTimeSeconds <= nextTimePeriodSeconds
  ) {
    timePeriodLowerIndex = i;
    timePeriodUpperIndex = i + 1;
    break;
  }
}

if (timePeriodUpperIndex === -1) {
  return baseColor;
}

const lowerTimePeriod = sortedTimePeriods[timePeriodLowerIndex];
const upperTimePeriod = sortedTimePeriods[timePeriodUpperIndex];

const timeDiffSeconds =
  (upperTimePeriod.GetTimePeriodInMs() - lowerTimePeriod.GetTimePeriodInMs()) /
  1000;
const valueDiff = upperTimePeriod.value - lowerTimePeriod.value;

const clampedRecencyTimeSeconds =
  actualRecencyTimeSeconds - lowerTimePeriod.GetTimePeriodInMs() / 1000;
const clampedProgress = clampedRecencyTimeSeconds / timeDiffSeconds;
const clampedValue = clampedProgress * valueDiff;
const value = clampedValue + lowerTimePeriod.value;

const baseColorRgb = BibleVizUtils.Functions.HexToRgb({ hexColor: baseColor });
const userColorRgb = BibleVizUtils.Functions.HexToRgb({ hexColor: userColor });

const deltaColor = [
  userColorRgb[0] - baseColorRgb[0],
  userColorRgb[1] - baseColorRgb[1],
  userColorRgb[2] - baseColorRgb[2],
];
const colorToAdd = [
  deltaColor[0] * value,
  deltaColor[1] * value,
  deltaColor[2] * value,
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
