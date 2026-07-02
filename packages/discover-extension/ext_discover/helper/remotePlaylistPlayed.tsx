import { runPlaylistPlaying } from "ext_discover.helper.runPlaylistPlaying";
import { openSelf } from "ext_discover.helper.openSelf";

export function remotePlaylistPlayed(that: any, _thisBot: any) {
  const playlist = that.playlist;
  const features = that.features;
  const G = globalThis as any;
  void openSelf();
  G.RemotePlaylistPlayed = true;
  void runPlaylistPlaying({ features, playlist, remoteClick: true });
}
