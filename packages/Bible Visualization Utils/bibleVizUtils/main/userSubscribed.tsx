import { readingHistoryColorStore } from "bibleVizUtils.services.ReadingHistoryColorStore";

const {
  subscribedTo: { id: authId },
} = that;

let color: string;
const componentsBot = getBot(byTag("system", "app.components"));
const userData = componentsBot.tags.usersAuthIds?.find((currUserData) => {
  return currUserData.authId === authId;
});

if (userData) {
  const { configId } = userData;
  const { color: userColor } = globalThis?.GetOrSetVisualInTags(configId);
  color = userColor;
} else {
  const randomColor: string = BibleVizUtils.Functions.GetRandomColor();
  color = randomColor;
}

readingHistoryColorStore.addUserColor(authId, color);
globalThis.ScriptureMapHandleSubscriptionsChanged?.();
