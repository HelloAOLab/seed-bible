import { getStorageBot } from "ext_discover.storage.getStorageBot";

export async function getBookmarks(that?: any) {
  const G = globalThis as any;
  const storageBot = getStorageBot();
  setTag(storageBot, "bookmarks", {});
  let apiResults: any = {};
  try {
    const authBot = await os.requestAuthBotInBackground();
    if (authBot.id) {
      G.WAS_PREV_AUTH = true;
      apiResults = await os.getData(authBot.id, "bookmarks");
      if (apiResults.data) {
        setTag(storageBot, "bookmarks", { ...apiResults.data });
        if (G.SetBookmarks) {
          G.SetBookmarks({ ...apiResults.data });
        }
      }
    }
  } catch (err) {
    console.log("err", err);
  }
  return apiResults;
}
