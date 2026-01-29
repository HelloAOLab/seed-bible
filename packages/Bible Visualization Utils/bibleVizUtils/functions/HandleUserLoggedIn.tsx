import { TryInitializeReadingHistoryColorStore } from "bibleVizUtils.functions.TryInitializeReadingHistoryColorStore";

const { authBot } = that;

console.log(`[Debug] HandleUserLoggedIn`, { authBot });

if (!BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled) {
  console.log(
    `[Debug] HandleUserLoggedIn !BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled`
  );
  BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled = true;
  shout("onAuthBotAdded");
  TryInitializeReadingHistoryColorStore(authBot);
}
