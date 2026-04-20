import type { Piece } from "bibleVizUtils.domain.models.canvas";

export type BibleVizUtilsEventCallback = (payload?: any) => void;

export interface BibleVizUtilsEvents {
  UserColorStoreChanged: void;
  OnlineUsersChanged: void;
  OnEnterHistoryMode: void;
  OnExitHistoryMode: void;
  OnUserPresenceUpdate: void;
  OnUserLoggedIn: void;
  OnArrangementIndexChanged: { newIndex: number };
  OnCustomArrangementsChanged: undefined;
  OnLabelDateFormatChange: undefined;
  OnPieceClick: { piece: Piece };
}

export type BibleVizUtilsEvent = keyof BibleVizUtilsEvents;
