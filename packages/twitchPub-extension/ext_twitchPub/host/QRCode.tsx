import { useI18n } from "seed-bible/i18n";
import QRCode from "https://esm.run/qrcode";
import { type TwitchPubState } from "./interface";
import { useEffect, useRef, useState } from "preact/hooks";
const QR_RENDER_SIZE = 512;

function QRCodeComponent(props: {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
  uiHidden: boolean;
  onClick?: () => void;
  state: TwitchPubState;
}) {
  const {
    value,
    size = 100,
    dark = "#000000",
    light = "#ffffff",
    uiHidden,
    onClick,
  } = props;
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(null);
  // Displayed pixel width. Kept relative to the surrounding .twitchPub-page;
  // falls back to `size` until the page has been measured.
  const [pixelSize, setPixelSize] = useState(size);
  const pixelSizeRef = useRef(pixelSize);
  pixelSizeRef.current = pixelSize;

  useEffect(() => {
    const page = canvasRef.current?.closest<HTMLElement>(".twitchPub-page");
    if (!page) return;

    const update = () => {
      const next = Math.round(
        Math.min(page.clientWidth * 0.75, page.clientHeight * 0.65)
      );
      if (next > 0) setPixelSize(next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: QR_RENDER_SIZE,
      color: { dark, light },
      errorCorrectionLevel: "H",
    }).then(() => {
      setError(null);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.width = pixelSizeRef.current + "px";
        canvas.style.height = pixelSizeRef.current + "px";
      }
    });
  }, [value, dark, light]);

  // Rescale the on-screen canvas whenever the target display size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.width = pixelSize + "px";
    canvas.style.height = pixelSize + "px";
  }, [pixelSize]);

  if (error)
    return (
      <p style={{ color: "red" }}>
        {t("qrError", { ns: "ext_twitchPub", error })}
      </p>
    );

  return (
    <>
      <style>
        {uiHidden &&
          `
        .qr-drag-handle {
          opacity: 0;
        }
      `}
      </style>
      <div
        style={{
          position: "relative",
          display: "inline-block",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block" }}
          onClick={() => {
            onClick?.();
          }}
        />
      </div>
    </>
  );
}
export default QRCodeComponent;
