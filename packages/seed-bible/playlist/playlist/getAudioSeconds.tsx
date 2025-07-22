const blob = that.blob;

if (!blob) return 1;

const buffer = await bytes.fromBase64Url(blob).arrayBuffer();

return (buffer.byteLength / 1024 * 48) / 1000;