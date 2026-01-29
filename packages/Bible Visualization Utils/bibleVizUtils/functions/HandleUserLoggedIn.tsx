import { TryInitializeReadingHistoryColorStore } from "bibleVizUtils.functions.TryInitializeReadingHistoryColorStore";

const { authBot } = that;

shout("onAuthBotAdded");
TryInitializeReadingHistoryColorStore(authBot);
