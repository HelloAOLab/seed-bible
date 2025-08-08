const typingTool = getBot(byTag("mmTypingManager"));
const arrowUps = getBots(byTag("arrowUp"));
const arrowDowns = getBots(byTag("arrowDown"));
const arrowRights = getBots(byTag("arrowRight"));
const arrowLefts = getBots(byTag("arrowLeft"));
const dataslits = getBots(byTag("dataSlit"));
const eventBots = getBots("eventBot");
destroy(arrowUps)
destroy(arrowDowns)
destroy(arrowRights)
destroy(arrowLefts)
destroy(dataslits)
destroy(eventBots);

typingTool.tags.eventSlitManager = {
    "dataList": [],
    "selectedIndex": 0,
    "state": ""
};

os.unregisterApp('slider')