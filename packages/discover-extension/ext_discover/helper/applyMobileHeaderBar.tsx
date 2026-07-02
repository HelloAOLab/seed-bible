import { MobilePlaylistHeaderBar } from "ext_discover.components.MobilePlaylistHeaderBar";
import { createMobilePlaylistHeaderBarManager } from "ext_discover.managers.MobilePlaylistHeaderBarManager";
import type { ApplyMobileHeaderBarOptions } from "ext_discover.interfaces.helper.applyMobileHeaderBar";

const G = globalThis as Record<string, any>;

const headerBarManager = createMobilePlaylistHeaderBarManager();

export function applyMobileHeaderBar(opts: ApplyMobileHeaderBarOptions) {
  headerBarManager.apply(opts);
  G.SetMobileHeaderBar(<MobilePlaylistHeaderBar manager={headerBarManager} />);
}
