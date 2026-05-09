const typingTool = getBot(byTag("mmTypingManager"));
let arrowUps = getBots(byTag("arrowUp"));
let arrowDowns = getBots(byTag("arrowDown"));
let arrowRights = getBots(byTag("arrowRight"));
let arrowLefts = getBots(byTag("arrowLeft"));
let dataslits = getBots(byTag("dataSlit"));
let eventBots = getBots("eventBot");
destroy(arrowUps);
destroy(arrowDowns);
destroy(arrowRights);
destroy(arrowLefts);
destroy(dataslits);
destroy(eventBots);

typingTool.tags.eventSlitManager = {
  dataList: [],
  selectedIndex: 0,
  state: "",
};

os.unregisterApp("slider");
