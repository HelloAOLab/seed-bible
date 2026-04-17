import QRCodeComponent from "ext_twitchPub.host.QRCode";
import { TwitchIcon, SettingsIcon } from "ext_twitchPub.host.icons";
import sendAnnouncement from "ext_twitchPub.host.sendAnnouncement";
import initializeTwitchBot from "ext_twitchPub.host.initializeTwitchBot";
import getUrl from "ext_twitchPub.host.getUrl";

const { useState, useEffect, useRef } = os.appHooks;
const TwitchInterface = (props: {
  broadcasterId: string | null;
  clientId: string | null;
  token: string | null;
  setCurrentPage: (
    s: "login" | "authorization" | "interface" | "settings"
  ) => void;
  annoucementTimer: number;
}) => {
  const { broadcasterId, clientId, token, setCurrentPage, annoucementTimer } =
    props;
  const [uiHidden, setUiHidden] = useState(false);
  const [announcementSend, setAnnouncementSend] = useState(false);

  const currentBookDataRef = useRef<string | null>(
    masks?.currentBookData || null
  );

  const [qrValue, setQrValue] = useState<string>(
    getUrl({ clientId: clientId || "", broadcasterId: broadcasterId || "" })
  );

  useEffect(() => {
    globalThis.currentBookDataRef = currentBookDataRef;
    globalThis.SetQrValue = setQrValue;
    globalThis.QrValue = qrValue;
    return () => {
      globalThis.currentBookDataRef = null;
      globalThis.SetQrValue = null;
      globalThis.QrValue = null;
    };
  }, [qrValue]);

  useEffect(() => {
    if (announcementSend || !broadcasterId || !clientId || !token) return;
    if (!announcementSend) {
      sendAnnouncement(
        token,
        broadcasterId,
        broadcasterId,
        `Join me at ${getUrl({ clientId: clientId || "", broadcasterId: broadcasterId || "" })}`,
        clientId || ""
      );
      setAnnouncementSend(true);
    }
    if (currentBookDataRef.current) {
      const currentBookData = JSON.parse(currentBookDataRef.current);
      setQrValue(
        getUrl({
          clientId: clientId || "",
          broadcasterId: broadcasterId || "",
          book: currentBookData.bookId,
          chapter: currentBookData.chapter,
          translation: currentBookData.translation,
        })
      );
    } else {
      setQrValue(
        getUrl({
          clientId: clientId || "",
          broadcasterId: broadcasterId || "",
          book: "GEN",
          chapter: 1,
          translation: "AAB",
        })
      );
    }
  }, [broadcasterId, clientId, token, announcementSend]);
  const hideUI = () => {
    if (masks?.hideUITimeout) {
      clearTimeout(masks.hideUITimeout);
    }
    const st = setTimeout(() => {
      setUiHidden(true);
    }, 4000);
    setTagMask(thisBot, "hideUITimeout", st, "local");
  };

  const hideUIOnTouch = () => {
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

  const showUIOnTouch = () => {
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
    draggableElement.addEventListener("touchstart", showUIOnTouch);
    draggableElement.addEventListener("touchend", hideUIOnTouch);
    hideUI();
    return () => {
      draggableElement.removeEventListener("mousedown", showUI);
      draggableElement.removeEventListener("mouseleave", hideUI);
      draggableElement.removeEventListener("touchstart", showUIOnTouch);
      draggableElement.removeEventListener("touchend", hideUIOnTouch);
    };
  }, []);

  useEffect(() => {
    if (!annoucementTimer || !broadcasterId || !clientId || !token) return;
    const st = setInterval(() => {
      if (masks?.uiLoaded) {
        console.log("Announcement timer tick");
        if (currentBookDataRef.current) {
          const currentBookData = JSON.parse(currentBookDataRef.current);
          sendAnnouncement(
            token,
            broadcasterId,
            broadcasterId,
            `Join me at ${getUrl({ clientId: clientId || "", broadcasterId: broadcasterId || "", book: currentBookData.bookId, chapter: currentBookData.chapter, translation: currentBookData.translation })}`,
            clientId || ""
          );
        }
      } else {
        console.log("UI not loaded, skipping announcement");
      }
    }, annoucementTimer);
    return () => {
      console.log("Clearing announcement timer");
      clearInterval(st);
    };
  }, [annoucementTimer, broadcasterId, clientId, token]);

  useEffect(() => {
    if (!broadcasterId || !clientId || !token) {
      console.error(
        "Missing broadcasterId, clientId, or token. Cannot initialize Twitch bot."
      );
      return;
    }
    let cancelled = false;
    let twitchBot: ReturnType<typeof initializeTwitchBot> extends Promise<
      infer T
    >
      ? T
      : never;
    (async () => {
      const bot = await initializeTwitchBot({
        BOT_USER_ID: broadcasterId,
        OAUTH_TOKEN: token,
        CLIENT_ID: clientId,
        CHAT_CHANNEL_USER_ID: broadcasterId,
      });
      if (cancelled) {
        bot?.close();
        return;
      }
      twitchBot = bot;
      console.log("Twitch bot initialized", bot);
    })();
    return () => {
      cancelled = true;
      if (twitchBot) {
        console.log("Closing Twitch bot connection...");
        twitchBot.close();
      }
    };
  }, [broadcasterId, clientId, token]);

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
          <div
            style={{
              display: "flex",
              gap: "5px",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            <button
              className="icon-btn"
              style={{ width: "fit-content", height: "fit-content" }}
              onClick={() => setCurrentPage("settings")}
            >
              <SettingsIcon width={18} height={18} />
            </button>
            <button
              className="icon-btn material-symbols-outlined"
              onClick={() => whisper(thisBot, "closeInterface")}
            >
              close
            </button>
          </div>
        </div>
        <div className="twitchPub-content">
          <div className={uiHidden ? "" : "qr-container"}>
            <QRCodeComponent value={qrValue} size={150} uiHidden={uiHidden} />
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
            Share this QR code
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
            Your viewers can scan this to follow you on Seed Bible
          </span>
        </div>
      </div>
    </>
  );
};
export default TwitchInterface;
