const {arrangement, editionIndex} = that;

const fixedArrangement = GetFixedArrangementFromTemplate(arrangement)

thisBot.vars.customArrangements?.splice(editionIndex, 1, fixedArrangement)

thisBot.UpdateFixedArrangementsInfo();