const currentArrangementName = thisBot.GetCurrentArrangementName()

thisBot.vars.fixedArrangementsInfo = [
    ...thisBot.tags.arrangementsInfo,
    ...thisBot.vars.customArrangements
]

thisBot.SetArrangementIndexByName({name: currentArrangementName ?? thisBot.vars.fixedArrangementsInfo[0].name});