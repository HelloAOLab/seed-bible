import { readingHistoryColorStore } from "bibleVizUtils.services.ReadingHistoryColorStore";

const { unsubscribedFromId } = that;

readingHistoryColorStore.removeUserColor(unsubscribedFromId);
