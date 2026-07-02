import { signal } from "@preact/signals";
import type { MobilePlaylistHeaderBarManager } from "ext_discover.interfaces.managers.MobilePlaylistHeaderBarManager";
import type { ApplyMobileHeaderBarOptions } from "ext_discover.interfaces.helper.applyMobileHeaderBar";

export function createMobilePlaylistHeaderBarManager(): MobilePlaylistHeaderBarManager {
  const isCurrentVisible = signal(true);
  const currentPlaylistName = signal("");
  const nextItem = signal<ApplyMobileHeaderBarOptions["nextItem"]>(null);
  const currentItem = signal<ApplyMobileHeaderBarOptions["currentItem"]>(null);
  const parentId = signal("default");

  let visibilityTimer: ReturnType<typeof setTimeout> | null = null;

  const apply = (opts: ApplyMobileHeaderBarOptions) => {
    currentPlaylistName.value = opts.currentPlaylistName;
    nextItem.value = opts.nextItem ?? null;
    currentItem.value = opts.currentItem ?? null;
    parentId.value = opts.parentId || "default";
    isCurrentVisible.value = true;

    if (visibilityTimer) {
      clearTimeout(visibilityTimer);
    }
    visibilityTimer = setTimeout(() => {
      isCurrentVisible.value = false;
      visibilityTimer = null;
    }, 4000);
  };

  return {
    isCurrentVisible,
    currentPlaylistName,
    nextItem,
    currentItem,
    parentId,
    apply,
  };
}
