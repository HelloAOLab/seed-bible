const currentArrangementName = StacksManager.GetCurrentArrangementName()

thisBot.vars.fixedArrangementsInfo = [
    ...StacksManager.tags.arrangementsInfo,
    ...thisBot.vars.customArrangements
]

StacksManager.SetArrangementIndexByName({name: currentArrangementName ?? thisBot.vars.fixedArrangementsInfo[0].name});