import { OnAddDateModal } from "ext_discover.components.OnAddDateModal";
import { getOnAddDateModalManager } from "ext_discover.managers.OnAddDateModalManager";

const G = globalThis as Record<string, any>;

const APP_NAME = "on-date-add";

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function openOnAddDateModal(that: { onAttach: (date: string) => void }) {
  const manager = getOnAddDateModalManager();
  manager.init(that);

  os.unregisterApp(APP_NAME);
  os.registerApp(APP_NAME, getPlaylistBot());
  os.compileApp(APP_NAME, <OnAddDateModal manager={manager} />);
}
