const { deltaTime } = that;

const sortedTimePeriods =
  BibleVizUtils.Data.masks.historyTimePeriodsInfo.toSorted(
    (periodInfoA, periodInfoB) => {
      return periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs();
    }
  );
const greaterTimePeriodTime =
  sortedTimePeriods[sortedTimePeriods.length - 1].GetTimePeriodInMs();
const normalizedTimePeriods = sortedTimePeriods.map((timePeriod) => {
  return {
    normalizedTime: timePeriod.GetTimePeriodInMs() / greaterTimePeriodTime,
    timePeriod,
  };
});
const actualDeltaTime = Math.min(deltaTime, greaterTimePeriodTime);
const actualDeltaTimeNormalized = actualDeltaTime / greaterTimePeriodTime;
let timePeriodLowerIndex = -1;
let timePeriodUpperIndex = -1;

for (let i = 0; i < normalizedTimePeriods.length - 1; i++) {
  if (
    actualDeltaTimeNormalized >= normalizedTimePeriods[i].normalizedTime &&
    actualDeltaTimeNormalized <= normalizedTimePeriods[i + 1].normalizedTime
  ) {
    timePeriodLowerIndex = i;
    timePeriodUpperIndex = i + 1;
    break;
  }
}
const endColorRgb = thisBot.HexToRgb({
  hexColor: normalizedTimePeriods[timePeriodUpperIndex].timePeriod.color,
});
const startColorRgb = thisBot.HexToRgb({
  hexColor: normalizedTimePeriods[timePeriodLowerIndex].timePeriod.color,
});
const colorProgress = Math.max(
  0,
  Math.min(
    1,
    (actualDeltaTimeNormalized -
      normalizedTimePeriods[timePeriodLowerIndex].normalizedTime) /
      (normalizedTimePeriods[timePeriodUpperIndex].normalizedTime -
        normalizedTimePeriods[timePeriodLowerIndex].normalizedTime)
  )
);
const deltaColor = [
  endColorRgb[0] - startColorRgb[0],
  endColorRgb[1] - startColorRgb[1],
  endColorRgb[2] - startColorRgb[2],
];
const finalColor = [
  startColorRgb[0] + Math.floor(deltaColor[0] * colorProgress),
  startColorRgb[1] + Math.floor(deltaColor[1] * colorProgress),
  startColorRgb[2] + Math.floor(deltaColor[2] * colorProgress),
];
const finalColorHex = thisBot.RgbToHex({ rgbColor: finalColor });
return finalColorHex;
