import { MouseCursorFollow } from "ext_discover.components.MouseCursorFollow";
import { getCursorFollowManager } from "ext_discover.managers.CursorFollowManager";
import type { CursorFollowOptions } from "ext_discover.interfaces.helper.cursorFollow";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export async function cursorFollow(opts: CursorFollowOptions = {}) {
  const manager = getCursorFollowManager();
  const icon = opts.icon || opts.type || "rebase";

  os.unregisterApp("mouseCursor");
  await os.registerApp("mouseCursor", getPlaylistBot());
  manager.start({ icon });
  os.compileApp("mouseCursor", <MouseCursorFollow manager={manager} />);
}
