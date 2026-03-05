import { bibleVizUtilsEventManager } from "bibleVizUtils.services.index";
import { updateUserColorStore } from "bibleVizUtils.controllers.userPresence.colorStoreController";

const { onlineUsers } = that;

console.log(`[Debug] OnOnlineUsersChanged`, onlineUsers);

const fixedOnlineUsers = new Map();
if (onlineUsers) {
  for (const key in onlineUsers) {
    if (key === "info") continue;

    const { book, bookId, chapter } = onlineUsers[key];

    fixedOnlineUsers.set(key, {
      book,
      bookId,
      chapter,
    });
  }
}

updateUserColorStore();
bibleVizUtilsEventManager.emit("OnlineUsersChanged", fixedOnlineUsers);
