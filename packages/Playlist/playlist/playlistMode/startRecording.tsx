const G = globalThis;
const val = that;
G.ORIGINAL_DATA = null;
G.ORIGINAL_DATA = null;
G.SetRecordingData?.(null);
G.SetRecording?.(val);
if (val === "link") {
  G.ToggleCommandBox();
}
