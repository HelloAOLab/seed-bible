const val = that;
globalThis.ORIGINAL_DATA = null;
globalThis.SetRecordingData?.(null);
globalThis.SetRecording?.(val);

if(val === "link") {
    globalThis.ToggleCommandBox();
}