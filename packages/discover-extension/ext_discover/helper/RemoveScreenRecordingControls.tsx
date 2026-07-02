import { getScreenRecordingStopButtonManager } from "ext_discover.managers.ScreenRecordingStopButtonManager";

export function RemoveScreenRecordingControls(_that?: any) {
  const name = "ShowScreenRecordingStopButton";
  getScreenRecordingStopButtonManager().cleanup();
  os.unregisterApp(name);
}
