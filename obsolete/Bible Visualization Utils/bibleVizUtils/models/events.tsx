export type BibleVizUtilsEventCallback = (payload?: any) => void;

export const BibleVizUtilsEvents = {
  UserColorStoreChanged: "UserColorStoreChanged",
  OnlineUsersChanged: "OnlineUsersChanged",
  OnEnterHistoryMode: "OnEnterHistoryMode",
  OnExitHistoryMode: "OnExitHistoryMode",
  OnUserPresenceUpdate: "OnUserPresenceUpdate",
  OnUserLoggedIn: "OnUserLoggedIn",
  OnCustomArrangementsChanged: "OnCustomArrangementsChanged",
  OnArrangementIndexChanged: "OnArrangementIndexChanged",
} as const;

export type BibleVizUtilsEvent =
  (typeof BibleVizUtilsEvents)[keyof typeof BibleVizUtilsEvents];
