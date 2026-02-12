import { readingHistoryColorStore } from "bibleVizUtils.services.ReadingHistoryColorStore";
import { getSubscribedUsers, SubscribedUser } from "db.annotations.library";

function TryInitializeReadingHistoryColorStore(myAuthBot: object) {
  const { color: myUserColor } = globalThis?.GetOrSetVisualInTags(configBot.id);
  readingHistoryColorStore.addUserColor(myAuthBot.id, myUserColor);

  getSubscribedUsers().then((subscribedUsers: SubscribedUser[] | null) => {
    if (subscribedUsers) {
      subscribedUsers?.forEach((subscribedUser) => {
        const { id: subscribedUserId } = subscribedUser;
        const randomColor = BibleVizUtils.Functions.GetRandomColor();
        readingHistoryColorStore.addUserColor(subscribedUserId, randomColor);
      });
    }
  });
}

export { TryInitializeReadingHistoryColorStore };
