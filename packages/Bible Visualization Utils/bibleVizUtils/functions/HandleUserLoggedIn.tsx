import { TryInitializeReadingHistoryColorStore } from "bibleVizUtils.functions.TryInitializeReadingHistoryColorStore";

const { authBot } = that;

if (!BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled) {
  BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled = true;
  shout("onAuthBotAdded");
  TryInitializeReadingHistoryColorStore(authBot);
}
