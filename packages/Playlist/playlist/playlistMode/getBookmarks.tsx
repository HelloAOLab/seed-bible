setTag(thisBot, "bookmarks", {});
let apiResults = {};
try {
  const authBot = await os.requestAuthBotInBackground();
  if (authBot.id) {
    globalThis.WAS_PREV_AUTH = true;
    apiResults = await os.getData(authBot.id, "bookmarks");
    if (apiResults.data) {
      setTag(thisBot, "bookmarks", { ...apiResults.data });
      if (globalThis.SetBookmarks) {
        globalThis.SetBookmarks({ ...apiResults.data });
      }
    }
  }
} catch (err) {
  console.log("err", err);
}
return apiResults;