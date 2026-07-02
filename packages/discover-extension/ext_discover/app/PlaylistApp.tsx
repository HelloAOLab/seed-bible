import { PlaylistUI } from "ext_discover.components.PlaylistUI";
import { getPlaylistAppManager } from "ext_discover.managers.PlaylistAppManager";
import type { PlaylistUIProps } from "ext_discover.interfaces.components.PlaylistUI";

export function PlaylistApp(_props?: { id?: string }) {
  const app = getPlaylistAppManager();
  const bot = app.thisBot.value as PlaylistUIProps["thisBot"] | null;

  return (
    <PlaylistUI
      shell={app.shell}
      edit={app.edit}
      annotation={app.annotation}
      groups={app.groups}
      thisBot={
        bot ?? {
          tags: {},
          StopPlayingPlaylist: () => {},
          CloseFloatingApp: () => {},
          CloseSelf: () => {},
          resetPlaylistGlobalStateVars: () => {},
          resetEditingState: () => {},
        }
      }
    />
  );
}
