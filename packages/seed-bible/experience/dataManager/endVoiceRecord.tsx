const { setData } = that || {};
const data = await os.endAudioRecording();
if (setData) {
  globalThis.ORIGINAL_DATA = data;
  data.arrayBuffer().then((buffer: any) => {
    const base64 = bytes.toBase64Url(
      new Uint8Array(buffer),
      data.type.split(";")[0]
    );
    setData(base64);
    ShowNotification({
      message: `Voice Recording Completed.`,
      severity: "success",
    });
  });
}
