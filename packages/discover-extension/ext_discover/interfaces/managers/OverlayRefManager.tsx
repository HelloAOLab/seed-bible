import type { Signal } from "@preact/signals";

export interface OverlayRefManager {
  dataItems: Signal<Record<string, any>[]>;
  removeID: Signal<string | undefined>;
  playListId: Signal<string | undefined>;
  linkingMode: Signal<boolean>;
  position: Signal<{ x: number; y: number }>;
  appName: string;
  init: (opts: {
    items: Record<string, any>[];
    removeID?: string;
    playListId?: string;
    linkingMode?: boolean;
  }) => void;
  unLinkItem: (index: number) => void;
  close: () => void;
}
