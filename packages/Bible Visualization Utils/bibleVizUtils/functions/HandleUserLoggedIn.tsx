import { TryInitializeReadingHistoryColorStore } from "bibleVizUtils.functions.TryInitializeReadingHistoryColorStore";

import {
  getReadingHistoryEvents,
  calculateReadingHistorySummary,
  getSubscribedUsers,
  flat,
} from "db.annotations.library";
import type { SubscribedUser } from "db.annotations.library";

const { authBot } = that;

if (!BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled) {
  console.log(`[Debug] HandleUserLoggedIn`);
  BibleVizUtils.Main.masks.hasUserLoggedInBeenHandled = true;
  shout("onAuthBotAdded");
  TryInitializeReadingHistoryColorStore(authBot);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const yesterdaySeconds = nowSeconds - 24 * 60 * 60;

  const ids: string[] = [authBot.id];
  const subscribedUsers: SubscribedUser[] | null = await getSubscribedUsers();
  if (subscribedUsers) {
    ids.push(
      ...subscribedUsers.map((user: SubscribedUser) => {
        return user.id;
      })
    );
  }

  const allEvents = await Promise.all(
    ids.map((id) => {
      return getReadingHistoryEvents(id, yesterdaySeconds, nowSeconds);
    })
  );
  const eventsArray = Array.from(flat(allEvents));
  const mySummary = calculateReadingHistorySummary(eventsArray);

  console.log(`[Debug] HandleUserLoggedIn`, {
    eventsArray,
    mySummary,
    nowSeconds,
    yesterdaySeconds,
  });
}
