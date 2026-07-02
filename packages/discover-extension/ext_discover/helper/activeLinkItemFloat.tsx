import type { ActiveLinkItemFloat } from "ext_discover.interfaces.helper.activeLinkItemFloat";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function getCurrentActiveLinkItemFloat(): ActiveLinkItemFloat | null {
  const bot = getPlaylistBot();
  return (
    bot.CURRENT_ACTIVE_LINK_ITEM_FLOAT ??
    G.CURRENT_ACTIVE_LINK_ITEM_FLOAT ??
    null
  );
}

export function setCurrentActiveLinkItemFloat(
  item: ActiveLinkItemFloat | null
) {
  G.CURRENT_ACTIVE_LINK_ITEM_FLOAT = item;
  getPlaylistBot().CURRENT_ACTIVE_LINK_ITEM_FLOAT = item;
}

export function clearCurrentActiveLinkItemFloat() {
  setCurrentActiveLinkItemFloat(null);
}
