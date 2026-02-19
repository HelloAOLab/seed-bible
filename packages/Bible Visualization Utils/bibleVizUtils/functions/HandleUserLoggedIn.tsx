import { updateUserColorStoreDebouncer } from "bibleVizUtils.services.UpdateUserColorStoreDebouncer";

const { authBot } = that;

if (!BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled) {
  BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled = true;
  shout("onAuthBotAdded");
  // updateUserColorStoreDebouncer.execute("HandleUserLoggedIn");
}
