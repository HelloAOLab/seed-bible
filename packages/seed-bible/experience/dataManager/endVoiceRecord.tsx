let { setData } = that || {};
const data = await os.endAudioRecording();
if (setData) {
    data.arrayBuffer().then(buffer => {
        const base64 = bytes.toBase64Url(new Uint8Array(buffer), data.type.split(";")[0]);
        setData(base64);
        ShowNotification({ message: `Voice Recording Completed.`, severity: "success" });
    })
}
