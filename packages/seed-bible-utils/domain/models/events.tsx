// eslint-disable-next-line
export type BibleVizUtilsEventCallback = (payload?: any) => void;

export interface SeedBibleUtilsEvents {
  UserColorStoreChanged: void;
  OnlineUsersChanged: void;
  OnEnterHistoryMode: void;
  OnExitHistoryMode: void;
  OnUserPresenceUpdate: void;
  OnUserLoggedIn: void;
  OnArrangementIndexChanged: { newIndex: number };
  OnCustomArrangementsChanged: undefined;
  OnLabelDateFormatChange: undefined;
}

export type SeedBibleUtilsEvent = keyof SeedBibleUtilsEvents;
