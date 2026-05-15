import { type Signal } from "@preact/signals";
import { type SeedBibleState } from "seed-bible.app.api";
interface IconProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  style?: React.CSSProperties;
}

interface TwitchPubState {
  interfaceEnabled: Signal<boolean>;
  clientId: Signal<string>;
  currentPage: Signal<"login" | "authorization" | "interface" | "settings">;
  deviceCode: Signal<string | null>;
  userAccessToken: Signal<string | null>;
  senderId: Signal<string | null>;
  broadcasterId: Signal<string | null>;
  loading: Signal<boolean>;
  settings: Signal<{
    translation: {
      enabled: boolean;
    };
    highlight: {
      enabled: boolean;
    };
    announcementTimer: {
      enabled: boolean;
      interval: number | null;
    };
  }>;
  uiHidden: Signal<boolean>;
  qrValue: Signal<string>;
  getDeviceAuthUrl: (state: TwitchPubState) => void;
  setCurrentPage: (page: TwitchPubState["currentPage"]["value"]) => void;
  hideUI: () => void;
  showUI: () => void;
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

export type { IconProps, TwitchPubState };
