import { type Signal } from "@preact/signals";
import { type SeedBibleState } from "seed-bible";

interface IconProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  style?: React.CSSProperties;
}

interface TwitchPubState {
  interfaceEnabled: Signal<boolean>;
  twitchConfig: Signal<{
    clientId: Signal<string>;
    channelId: Signal<string>;
    broadcasterId: Signal<string>;
    senderId: Signal<string>;
    userAccessToken: Signal<string>;
  }>;
  currentPage: Signal<"login" | "authorization" | "interface" | "settings">;
  deviceCode: Signal<string | null>;
  loading: Signal<boolean>;
  settings: Signal<{
    translation: Signal<{ enabled: boolean }>;
    highlight: Signal<{ enabled: boolean }>;
    announcementTimer: Signal<{ enabled: boolean; interval: number | null }>;
  }>;
  uiHidden: Signal<boolean>;
  qrValue: Signal<string>;
  getDeviceAuthUrl: (state: TwitchPubState) => void;
  setCurrentPage: (page: TwitchPubState["currentPage"]["value"]) => void;
  hideUI: () => void;
  showUI: () => void;
  toast: (message: string) => void;
  handleSeedBibleUpdate: (seedBibleState: SeedBibleState) => void;
  handleHighlightUpdate: (
    highlights: {
      colorId: string;
      verse: number | [number, number];
      customColor?: string | undefined;
      customFontColor?: string | undefined;
    }[],
    bookId: string,
    chapterNumber: number
  ) => void;
}

// ── Twitch EventSub WebSocket message interfaces ──────────────────────────────

interface WSBaseMetadata {
  message_id: string;
  message_type: string;
  message_timestamp: string; // RFC3339 with nanoseconds
}

interface WSTransport {
  method: "websocket";
  session_id: string;
}

interface WSSubscription {
  id: string;
  status: string;
  type: string;
  version: string;
  cost: number;
  condition: Record<string, unknown>;
  transport: WSTransport;
  created_at: string;
}

// session_welcome
interface WSWelcomeMetadata extends WSBaseMetadata {
  message_type: "session_welcome";
}
interface WSWelcomeSession {
  id: string;
  status: "connected";
  keepalive_timeout_seconds: number;
  reconnect_url: null;
  connected_at: string;
}
export interface WSWelcomeMessage {
  metadata: WSWelcomeMetadata;
  payload: { session: WSWelcomeSession };
}

// session_keepalive
interface WSKeepaliveMetadata extends WSBaseMetadata {
  message_type: "session_keepalive";
}
export interface WSKeepaliveMessage {
  metadata: WSKeepaliveMetadata;
  payload: Record<string, never>;
}

// notification
interface WSNotificationMetadata extends WSBaseMetadata {
  message_type: "notification";
  subscription_type: string;
  subscription_version: string;
}
export interface WSNotificationMessage<TEvent = Record<string, unknown>> {
  metadata: WSNotificationMetadata;
  payload: {
    subscription: WSSubscription & { status: "enabled" };
    event: TEvent;
  };
}

// session_reconnect
interface WSReconnectMetadata extends WSBaseMetadata {
  message_type: "session_reconnect";
}
interface WSReconnectSession {
  id: string;
  status: "reconnecting";
  keepalive_timeout_seconds: null;
  reconnect_url: string;
  connected_at: string;
}
export interface WSReconnectMessage {
  metadata: WSReconnectMetadata;
  payload: { session: WSReconnectSession };
}

// revocation
interface WSRevocationMetadata extends WSBaseMetadata {
  message_type: "revocation";
  subscription_type: string;
  subscription_version: string;
}
export type WSRevocationStatus =
  | "authorization_revoked"
  | "user_removed"
  | "version_removed";
export interface WSRevocationMessage {
  metadata: WSRevocationMetadata;
  payload: {
    subscription: WSSubscription & { status: WSRevocationStatus };
  };
}

// Union of all incoming WebSocket messages
export type WSTwitchMessage =
  | WSWelcomeMessage
  | WSKeepaliveMessage
  | WSNotificationMessage
  | WSReconnectMessage
  | WSRevocationMessage;

// WebSocket close codes (4000–4007)
export enum WSTwitchCloseCode {
  InternalServerError = 4000,
  ClientSentInboundTraffic = 4001,
  ClientFailedPingPong = 4002,
  ConnectionUnused = 4003,
  ReconnectGraceTimeExpired = 4004,
  NetworkTimeout = 4005,
  NetworkError = 4006,
  InvalidReconnect = 4007,
}

export type { IconProps, TwitchPubState };
