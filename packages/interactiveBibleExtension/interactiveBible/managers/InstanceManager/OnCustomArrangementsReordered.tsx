const {list} = that;

const fixedArrangements = list.map((template) => {
    return GetFixedArrangementFromTemplate(template)
})

thisBot.vars.customArrangements = fixedArrangements;

thisBot.UpdateFixedArrangementsInfo();