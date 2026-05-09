import QRCode from "https://esm.run/qrcode";

const { useEffect, useRef, useState, useCallback } = os.appHooks;

const MIN = 150;
const MAX = 300;

function QRCodeComponent(props: {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
  uiHidden: boolean;
}) {
  const {
    value,
    size = 256,
    dark = "#000000",
    light = "#ffffff",
    uiHidden,
  } = props;
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [dim, setDim] = useState(masks?.qrDim || size);
  const dragRef = useRef(null); // { startX, startY, startDim }

  // Render QR whenever value or dim changes
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: dim,
      color: { dark, light },
      errorCorrectionLevel: "H",
    })
      .then(() => setError(null))
      .catch((err) => setError(err.message));
  }, [value, dim, dark, light]);

  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { startX: e.clientX, startY: e.clientY, startDim: dim };

      const onMove = (e) => {
        const { startX, startY, startDim } = dragRef.current;
        const delta = (e.clientX - startX + e.clientY - startY) / 2;
        setDim(Math.round(Math.min(MAX, Math.max(MIN, startDim + delta))));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [dim]
  );

  // Touch support
  const onTouchStart = useCallback(
    (e) => {
      const t = e.touches[0];
      dragRef.current = { startX: t.clientX, startY: t.clientY, startDim: dim };

      const onMove = (e) => {
        const t = e.touches[0];
        const { startX, startY, startDim } = dragRef.current;
        const delta = (t.clientX - startX + t.clientY - startY) / 2;
        setDim(Math.round(Math.min(MAX, Math.max(MIN, startDim + delta))));
      };
      const onEnd = () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
    },
    [dim]
  );

  useEffect(() => {
    setTagMask(thisBot, "qrDim", dim, "local");
  }, [dim]);

  if (error) return <p style={{ color: "red" }}>QR Error: {error}</p>;

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
            os.setClipboard(value);
            os.toast("Link copied to clipboard!");
          }}
        />

        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          title={`drag to resize`}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            cursor: "nwse-resize",
            background: "rgba(0,0,0,0.35)",
            borderRadius: "4px 0 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="qr-drag-handle"
        >
          {/* Grip dots */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <circle cx="8" cy="2" r="1.2" />
            <circle cx="8" cy="6" r="1.2" />
            <circle cx="4" cy="6" r="1.2" />
            <circle cx="8" cy="10" r="1.2" />
            <circle cx="4" cy="10" r="1.2" />
            <circle cx="0" cy="10" r="1.2" />
          </svg>
        </div>
      </div>
    </>
  );
}
export default QRCodeComponent;
