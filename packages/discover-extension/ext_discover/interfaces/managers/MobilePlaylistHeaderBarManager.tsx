import type { Signal } from "@preact/signals";
import type { ApplyMobileHeaderBarOptions } from "ext_discover.interfaces.helper.applyMobileHeaderBar";

export interface MobilePlaylistHeaderBarManager {
  isCurrentVisible: Signal<boolean>;
  currentPlaylistName: Signal<string>;
  nextItem: Signal<ApplyMobileHeaderBarOptions["nextItem"]>;
  currentItem: Signal<ApplyMobileHeaderBarOptions["currentItem"]>;
  parentId: Signal<string>;
  apply: (opts: ApplyMobileHeaderBarOptions) => void;
}
