import { ScreenRecordingStopButton } from "ext_discover.components.ScreenRecordingStopButton";
import { getScreenRecordingStopButtonManager } from "ext_discover.managers.ScreenRecordingStopButtonManager";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function showScreenRecordingStopButton(that?: { video?: boolean }) {
  const name = "ShowScreenRecordingStopButton";
  const manager = getScreenRecordingStopButtonManager();

  os.unregisterApp(name);
  os.registerApp(name, getPlaylistBot());
  G.StopVideoRecording = false;
  manager.init(that);

  os.compileApp(name, <ScreenRecordingStopButton manager={manager} />);
}
