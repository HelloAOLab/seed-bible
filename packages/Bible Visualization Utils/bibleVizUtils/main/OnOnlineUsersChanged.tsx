import { updateUserColorStoreDebouncer } from "bibleVizUtils.services.UpdateUserColorStoreDebouncer";
import { bibleVizUtilsEventManager } from "bibleVizUtils.services.EventManager";

const { onlineUsers } = that;

if (!onlineUsers) return;
const fixedOnlineUsers = new Map();

for (const key in onlineUsers) {
  if (key === "info") continue;

  const { book, bookId, chapter } = onlineUsers[key];

  fixedOnlineUsers.set(key, {
    book,
    bookId,
    chapter,
  });
}

updateUserColorStoreDebouncer.execute();
bibleVizUtilsEventManager.emit("OnlineUsersChanged", fixedOnlineUsers);
