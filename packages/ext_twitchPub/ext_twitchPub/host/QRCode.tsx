import QRCode from "https://esm.run/qrcode";

const { useRef, useEffect, useState } = os.appHooks;
const QRCodeComponent = (props: {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
}) => {
  const { value, size = 200, dark = "#000000", light = "#FFFFFF" } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      color: { dark, light },
      errorCorrectionLevel: "H",
    })
      .then(() => setError(null))
      .catch((err: any) => setError(err.message));
  }, [value, size, dark, light]);

  if (error) return <p style={{ color: "red" }}>QR Error: {error}</p>;

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: "pointer" }}
      onClick={() => {
        os.setClipboard(value);
        os.toast("Link copied to clipboard!");
      }}
    />
  );
};
export default QRCodeComponent;
