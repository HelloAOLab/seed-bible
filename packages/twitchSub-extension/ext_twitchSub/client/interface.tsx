import { type Signal } from "@preact/signals";
export interface TwitchSubInterface {
  wsPaused: Signal<boolean>;
  settings: Signal<{
    translationEnabled: boolean;
    highlightEnabled: boolean;
    chapterFollowEnabled: boolean;
  }>;
  config: Signal<{
    botUserId: string;
    accessToken: string;
    clientId: string;
    broadcasterId: string;
    eventSubWebsocketUrl: string;
    channelId: string;
    bookId?: string;
    chapter?: string;
    translation?: string;
  } | null>;
  websocketSessionID: Signal<string | null>;
  webSocketClient: Signal<WebSocket | null>;
  handleWSEvents: (config: { type: string; payload: string }) => void;
  settingsOpened: Signal<boolean>;
}
