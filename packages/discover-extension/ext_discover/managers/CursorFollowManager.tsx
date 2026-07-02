import { signal } from "@preact/signals";
import type { CursorFollowManager } from "ext_discover.interfaces.managers.CursorFollowManager";

let singleton: CursorFollowManager | undefined;

export function getCursorFollowManager(): CursorFollowManager {
  if (!singleton) {
    singleton = createCursorFollowManager();
  }
  return singleton;
}

export function createCursorFollowManager(): CursorFollowManager {
  const pointer = signal({ x: 0, y: 0 });
  const icon = signal("rebase");
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const start = (opts?: { icon?: string }) => {
    icon.value = opts?.icon || "rebase";
    pointer.value = gridPortalBot.tags.pointerPixel;
    stop();
    intervalId = setInterval(() => {
      pointer.value = gridPortalBot.tags.pointerPixel;
    }, 20);
  };

  return {
    pointer,
    icon,
    start,
    stop,
  };
}
