import { FloatingBanner } from "ext_discover.features.components.FloatingBanner";
const G = globalThis as Record<string, any>;
const APP_NAME = "message";

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function showPlaylistInfo(message = "Playlist Mode") {
  os.unregisterApp(APP_NAME);
  os.registerApp(APP_NAME, getPlaylistBot());

  const InfoMessage = () => (
    <FloatingBanner>
      <b>{message}</b>
    </FloatingBanner>
  );

  os.compileApp(APP_NAME, <InfoMessage />);
}
