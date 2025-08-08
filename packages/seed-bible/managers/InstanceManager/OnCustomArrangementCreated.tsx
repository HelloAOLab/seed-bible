const {arrangement} = that;

console.log(`OnCustomArrangementCreated`)
// thisBot.HideCustomArrangementTool();

const fixedArrangement = GetFixedArrangementFromTemplate(arrangement)

thisBot.vars.customArrangements?.push?.(fixedArrangement);

thisBot.UpdateFixedArrangementsInfo();