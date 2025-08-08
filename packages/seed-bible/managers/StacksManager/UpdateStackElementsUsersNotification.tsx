const elementsData = [
    ...thisBot.vars.testamentsData,
    ...thisBot.vars.sectionsData,
    ...thisBot.vars.sectionBooksData,
    ...thisBot.vars.booksData,
    ...thisBot.vars.chaptersData,
]

InstanceManager.UpdateUsersNotificationOnElements({elementsData});