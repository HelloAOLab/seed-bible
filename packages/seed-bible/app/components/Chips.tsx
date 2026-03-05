import { useGlobalsContext } from "app.hooks.globalsContext";

const { useState, useRef, useEffect } = os.appHooks;

interface SharePopupProps {
  shareTitle: string;
  shareReference: string;
  translation: string;
  popupTitle: string;
  closePopupSettings: () => void;
}

const SharePopup = ({
  shareTitle,
  shareReference,
  translation = "BSB",
  popupTitle = "Share",
  closePopupSettings,
}) => {
  const globals = useGlobalsContext();
  const [copied, setCopied] = useState(false);
  // always include reference; no toggle needed

  // Build the verse reference from context if not provided
  const reference =
    shareReference || `${configBot.tags.book} ${configBot.tags.chapter}`;

  // Always include the verse reference when sharing
  const shareText = `"${shareTitle}" - ${reference} (${translation})`;

  const platforms = [
    // {
    //   name: "Discord",
    //   icon: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
    //   share: () => {
    //     os.setClipboard(shareText);
    //     window.open("https://discord.com/channels/@me", "_blank");
    //   },
    // },
    {
      name: "Telegram",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/512px-Telegram_logo.svg.png",
      share: () => window.open(`tg://msg?text=${shareText}`, "_blank"),
    },
    {
      name: "Whatsapp",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png",
      share: () => os.openURL(`https://wa.me/?text=${shareText}`),
    },
    // {
    //   name: "Facebook",
    //   icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png",
    //   share: () =>
    //     os.openURL(
    //       `https://www.facebook.com/sharer.php?u=https://ao.bot/?inst=${os.getCurrentInst()}&book=${configBot.tags.book}&chapter=${configBot.tags.chapter}`
    //     ),
    // },
    {
      name: "X",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/X_icon_2.svg/512px-X_icon_2.svg.png",
      share: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
          "_blank"
        ),
    },
    {
      name: "LinkedIn",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/600px-LinkedIn_logo_initials.png",
      share: () =>
        window.open(
          `https://www.linkedin.com/shareArticle?text=${shareText}`,
          "_blank"
        ),
    },
    // {
    //   name: "Reddit",
    //   icon: "https://pngdownload.io/wp-content/uploads/2023/12/Reddit-Logo-emblem-of-the-online-platform-transparent-png-image-jpg.webp",
    //   share: () =>
    //     window.open(
    //       `https://reddit.com/submit?title=${encodeURIComponent(shareText)}`,
    //       "_blank"
    //     ),
    // },
    // {
    //   name: "Instagram",
    //   icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/512px-Instagram_logo_2016.svg.png",
    //   share: () => {
    //     os.setClipboard(shareText);
    //     window.open("https://instagram.com", "_blank");
    //   },
    // },
    ...(globals.IsMobileNow()
      ? [
          {
            name: "Text",
            svg: (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ width: 28, height: 28, color: "#4A90D9" }}
              >
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              </svg>
            ),
            share: () => {
              window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
            },
          },
        ]
      : []),
    {
      name: "Copy",
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ width: 28, height: 28, color: "#666" }}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      ),
      share: () => {
        os.setClipboard(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    },
  ];

  const CloseIcon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ width: 18, height: 18 }}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <>
      <div
        onClick={() => closePopupSettings()}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 24px",
            maxWidth: 380,
            width: "90%",
            position: "relative",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "#1a1a1a",
              }}
            >
              {popupTitle}
            </h2>
            <button
              onClick={() => closePopupSettings()}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#999",
              }}
            >
              <CloseIcon />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {platforms.map((p) => (
              <button
                key={p.name}
                onClick={p.share}
                style={{
                  background: "#f5f5f5",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 8px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {p.icon ? (
                    <img
                      src={p.icon}
                      alt={p.name}
                      style={{ width: 36, height: 36, objectFit: "contain" }}
                    />
                  ) : (
                    p.svg
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>
                  {p.name === "Copy" && copied ? "Copied!" : p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .share-popup-btn:hover {
          background: #eee !important;
        }
      `}</style>
    </>
  );
};

const QRCodeComponent = ({ url = "https://example.com/session/12345" }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  // Load QRCode library dynamically from CDN
  useEffect(() => {
    const loadScript = async () => {
      if (!window.QRCode) {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        script.async = true;
        script.onload = () => generateQR();
        document.body.appendChild(script);
      } else {
        generateQR();
      }
    };

    const generateQR = () => {
      if (qrRef.current && window.QRCode) {
        qrRef.current.innerHTML = "";
        new window.QRCode(qrRef.current, {
          text: url,
          width: 200,
          height: 200,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H,
        });
      }
    };

    loadScript();
  }, [url]);

  const handleCopy = async () => {
    try {
      os.setClipboard(url);
      // await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            color: "#333",
            marginTop: 0,
            marginBottom: "30px",
            fontSize: "24px",
            fontWeight: "600",
            fontFamily: "Satoshi",
          }}
        >
          Session QR Code
        </h2>

        <div
          style={{
            // background: "#f8f9fa",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            ref={qrRef}
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              width: "200px",
              height: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </div>

        <div
          style={{
            background: "#f1f3f5",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "14px",
            color: "#495057",
            wordBreak: "break-all",
            fontFamily: "monospace",
          }}
        >
          {url}
        </div>

        <button
          onClick={handleCopy}
          style={{
            width: "100%",
            padding: "14px",
            background: copied ? "#28a745" : "#667eea",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            transform: copied ? "scale(0.98)" : "scale(1)",
            boxShadow: copied ? "none" : "0 4px 12px rgba(102, 126, 234, 0.4)",
            fontFamily: "Satoshi",
            background: "#d36433",
            color: "white",
          }}
        >
          {copied ? "✓ Copied!" : "Copy Session Link"}
        </button>
      </div>
    </div>
  );
};

interface JoinSessionComponentProps {
  onJoin: (code: string) => void;
  translations: any;
  CloseModal: () => void;
}

const JoinSessionComponent = ({ onJoin, translations = {}, CloseModal }) => {
  const [sessionCode, setSessionCode] = useState("");

  const t = {
    joinSession: translations.joinSession || "Join Session",
    enterSessionCode:
      translations.enterSessionCode || "Enter session code to join new session",
    sessionCodePlaceholder:
      translations.sessionCodePlaceholder || "Enter Session code",
    join: translations.join || "Join",
  };

  const handleJoin = () => {
    if (sessionCode.trim()) {
      onJoin(sessionCode.trim());
      CloseModal();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <div
      onClick={() => CloseModal()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panelBackground, #fff)",
          borderRadius: 12,
          padding: "32px 24px",
          maxWidth: 543,
          width: "90%",
          maxHeight: 373,
          boxShadow: "rgba(0, 0, 0, 0.15) 0px 10px 40px",
          height: 373,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 48,
          }}
        >
          <img
            src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1767786038/Seed_Bible_-_All_Logos_2025-04_dd6je1.png"
            style={{
              height: "42px",
              objectFit: "contain",
            }}
            alt="Seed Bible"
          />
        </div>

        <h2
          style={{
            textAlign: "center",
            color: "var(--text1, #000)",
            marginTop: 0,
            marginBottom: 8,
            fontSize: 22,
            fontWeight: 600,
            position: "relative",
            fontFamily: "Satoshi",
          }}
        >
          {t.joinSession}
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: 40,
            fontSize: 16,
            lineHeight: 1.4,
            position: "relative",
            fontFamily: "'DM Sans'",
            color: "var(--text2, #585858)",
            textAlign: "center",
          }}
        >
          {t.enterSessionCode}
        </p>

        <input
          type="text"
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t.sessionCodePlaceholder}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 14,
            border: "1px solid var(--inputBorder, transparent)",
            borderRadius: 4,
            backgroundColor: "var(--inputBackground, #dbdbdb)",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 16,
            color: "var(--text1, #333)",
            height: 48,
            position: "relative",
          }}
        />

        <button
          onClick={handleJoin}
          style={{
            width: "100%",
            cursor: "pointer",
            padding: 12,
            background: "var(--primaryButton, #d36433)",
            color: "var(--primaryButtonColor, white)",
            border:
              "1px solid var(--primaryButtonBorder, var(--primaryButton, #d36433))",
            borderRadius: 4,
            fontSize: 15,
            fontWeight: 500,
            transition: "background 0.2s",
            height: 48,
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          {t.join}
        </button>
      </div>
    </div>
  );
};

return { SharePopup, QRCodeComponent, JoinSessionComponent };
