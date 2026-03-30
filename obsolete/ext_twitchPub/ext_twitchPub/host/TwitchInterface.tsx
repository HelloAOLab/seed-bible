import QRCodeComponent from "ext_twitchPub.host.QRCode";
import { TwitchIcon } from "ext_twitchPub.host.icons";

const { useState, useEffect } = os.appHooks;
const TwitchInterface = (props: {
  broadcasterId: string | null;
  clientId: string | null;
  token: string | null;
}) => {
  const { broadcasterId, clientId, token } = props;
  const [uiHidden, setUiHidden] = useState(false);

  const [qrValue, setQrValue] = useState<string>(
    `https://ao.bot/?pattern=SeedBibleDev&book=GEN&chapter=1&translation=AAB&ext_twitchSub=true&broadcasterId=${broadcasterId}&clientId=${clientId}&token=${token}`
  );

  useEffect(() => {
    globalThis.SetQrValue = setQrValue;
    return () => {
      globalThis.SetQrValue = null;
    };
  }, []);

  useEffect(() => {
    if (masks?.currentData) {
      const data = JSON.parse(masks.currentData);
      setQrValue(
        `https://ao.bot/?pattern=SeedBibleDev&book=${data.bookId}&chapter=${data.chapter}&translation=${data.translation}&ext_twitchSub=true&broadcasterId=${broadcasterId}&clientId=${clientId}&token=${token}`
      );
    } else {
      setQrValue(
        `https://ao.bot/?pattern=SeedBibleDev&book=GEN&chapter=1&translation=AAB&ext_twitchSub=true&broadcasterId=${broadcasterId}&clientId=${clientId}&token=${token}`
      );
    }
  }, [broadcasterId, clientId, token]);

  const hideUI = () => {
    if (masks?.hideUITimeout) {
      clearTimeout(masks.hideUITimeout);
    }
    const st = setTimeout(() => {
      setUiHidden(true);
    }, 4000);
    setTagMask(thisBot, "hideUITimeout", st, "local");
  };

  const showUI = () => {
    if (masks?.hideUITimeout) {
      clearTimeout(masks.hideUITimeout);
    }
    setUiHidden(false);
  };

  useEffect(() => {
    const draggableElement = document.getElementById("draggable-container");
    if (!draggableElement) return;

    draggableElement.addEventListener("mousedown", showUI);
    draggableElement.addEventListener("mouseleave", hideUI);
    hideUI();
    return () => {
      draggableElement.removeEventListener("mousedown", showUI);
      draggableElement.removeEventListener("mouseleave", hideUI);
    };
  }, []);

  return (
    <>
      {uiHidden && (
        <style>{`
        .twitchPub-container {
          background: transparent;
          box-shadow: none;
        }
      `}</style>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "fit-content",
          width: "100%",
        }}
      >
        <div
          className="twitchPub-header"
          style={
            uiHidden
              ? {
                  opacity: 0,
                  pointerEvents: "none",
                  transition: "opacity 0.3s ease",
                }
              : { transition: "opacity 0.3s ease" }
          }
        >
          <span
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <TwitchIcon style={{ width: "24px", height: "24px" }} />
            Twitch
          </span>
          <button
            className="icon-btn"
            onClick={() => whisper(thisBot, "closeInterface")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="twitchPub-content">
          <div className={uiHidden ? "" : "qr-container"}>
            <QRCodeComponent value={qrValue} size={150} />
          </div>

          <span
            style={
              uiHidden
                ? {
                    opacity: 0,
                    pointerEvents: "none",
                    transition: "opacity 0.3s ease",
                  }
                : {
                    fontSize: "20px",
                    fontWeight: "bold",
                    textAlign: "center",
                    transition: "opacity 0.3s ease",
                  }
            }
          >
            Share this qr code
          </span>
          <span
            style={
              uiHidden
                ? {
                    opacity: 0,
                    pointerEvents: "none",
                    transition: "opacity 0.3s ease",
                  }
                : {
                    fontSize: "14px",
                    textAlign: "center",
                    transition: "opacity 0.3s ease",
                  }
            }
          >
            Share QR code with your viewer to let them join Seed Bible with you.
          </span>
        </div>
      </div>
    </>
  );
};
export default TwitchInterface;
