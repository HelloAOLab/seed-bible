import { signal } from "@preact/signals";
import type { OverlayRefManager } from "ext_discover.interfaces.managers.OverlayRefManager";

let singleton: OverlayRefManager | undefined;

export function getOverlayRefManager(): OverlayRefManager {
  if (!singleton) {
    singleton = createOverlayRefManager();
  }
  return singleton;
}

export function createOverlayRefManager(): OverlayRefManager {
  const appName = "overlay-ref";
  const dataItems = signal<Record<string, any>[]>([]);
  const removeID = signal<string | undefined>(undefined);
  const playListId = signal<string | undefined>(undefined);
  const linkingMode = signal(false);
  const position = signal({ x: 0, y: 0 });

  const init = (opts: {
    items: Record<string, any>[];
    removeID?: string;
    playListId?: string;
    linkingMode?: boolean;
  }) => {
    dataItems.value = [...opts.items];
    removeID.value = opts.removeID;
    playListId.value = opts.playListId;
    linkingMode.value = !!opts.linkingMode;
    position.value = gridPortalBot.tags.pointerPixel;
  };

  const close = () => {
    os.unregisterApp(appName);
  };

  const unLinkItem = (index: number) => {
    const old = [...dataItems.value];
    old.splice(index, 1);
    dataItems.value = old;
    if (old.length < 1) {
      close();
    }
  };

  return {
    dataItems,
    removeID,
    playListId,
    linkingMode,
    position,
    appName,
    init,
    unLinkItem,
    close,
  };
}
