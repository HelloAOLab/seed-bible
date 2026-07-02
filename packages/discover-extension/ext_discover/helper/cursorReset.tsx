import { getCursorFollowManager } from "ext_discover.managers.CursorFollowManager";

export function cursorReset(_that?: any) {
  getCursorFollowManager().stop();
  os.unregisterApp("mouseCursor");
}
