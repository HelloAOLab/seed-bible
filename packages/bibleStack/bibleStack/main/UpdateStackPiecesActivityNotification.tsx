const piecesData = [
    ...thisBot.vars.stackTestamentsData,
    ...thisBot.vars.stackSectionsData,
    ...thisBot.vars.stackSectionBooksData,
    ...thisBot.vars.stackBooksData,
    ...thisBot.vars.stackChaptersData,
]

BibleVizUtils.Functions.UpdateActivityNotificationOnPieces({piecesData, manager: thisBot});