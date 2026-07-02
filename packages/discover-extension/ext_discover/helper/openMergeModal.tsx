import { MergeModal } from "ext_discover.components.MergeModal";
import { getMergeModalManager } from "ext_discover.managers.MergeModalManager";
import type { OpenMergeModalOptions } from "ext_discover.interfaces.helper.openMergeModal";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function openMergeModal(opts: OpenMergeModalOptions) {
  const manager = getMergeModalManager();
  manager.init(opts);

  os.unregisterApp("merge-modal");
  os.registerApp("merge-modal", getPlaylistBot());
  os.compileApp("merge-modal", <MergeModal manager={manager} />);
}
