export type Platform = "non-ios" | "ios-safari" | "ios-other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isIOS) return "non-ios";

  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isSafari ? "ios-safari" : "ios-other";
}

const AddIcon = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="4" y="4" width="10" height="10" rx="3" fill="#555" />
    <rect x="4" y="22" width="10" height="10" rx="3" fill="#555" />
    <rect x="22" y="4" width="10" height="10" rx="3" fill="#555" />
    <rect x="22" y="22" width="10" height="10" rx="3" fill="#555" />
    <circle cx="42" cy="9" r="8" fill="#d36433" />
    <rect x="41" y="4" width="2" height="10" rx="1" fill="#fff" />
    <rect x="37" y="8" width="10" height="2" rx="1" fill="#fff" />
    <rect x="4" y="40" width="10" height="10" rx="3" fill="#555" />
    <rect x="22" y="40" width="10" height="10" rx="3" fill="#555" />
  </svg>
);

const SafariIcon = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="28" cy="28" r="24" fill="#0A84FF" />
    <circle cx="28" cy="28" r="22" fill="white" />
    <circle cx="28" cy="28" r="20" fill="#0A84FF" />
    <polygon points="28,10 30,26 28,28 26,26" fill="white" />
    <polygon points="28,46 26,30 28,28 30,30" fill="white" />
    <polygon points="10,28 26,26 28,28 26,30" fill="white" />
    <polygon points="46,28 30,30 28,28 30,26" fill="white" />
    <polygon points="28,8 29,26 28,28 27,26" fill="#FF3B30" />
    <polygon points="28,48 27,30 28,28 29,30" fill="#FF3B30" />
    <circle cx="28" cy="28" r="3" fill="white" />
  </svg>
);

interface AddToHomeScreenProps {
  onDismiss: () => void;
}

export function AddToHomeScreen({ onDismiss }: AddToHomeScreenProps) {
  const platform = detectPlatform();

  const handlePrimaryAction = () => {
    if (platform === "non-ios") {
      os.promptToInstallPWA();
    } else if (platform === "ios-safari") {
      os.share({ url: window.location.href });
    } else {
      os.setClipboard(window.location.href);
    }
    onDismiss();
  };

  const config = {
    "non-ios": {
      icon: <AddIcon />,
      title: "Add to your home screen",
      description:
        "Add Seed Bible to your home screen to return anytime. You can always find this option later in Settings.",
      primaryButton: "Install App",
    },
    "ios-safari": {
      icon: <AddIcon />,
      title: "Add to your home screen",
      description:
        "Add this to your home screen to return anytime. Tap Share then Add to Home Screen. You can always find this option later in Settings.",
      primaryButton: "Add to home screen",
    },
    "ios-other": {
      icon: <SafariIcon />,
      title: "Add to your home screen",
      description:
        "To add this to your home screen you\u2019ll need to open this in Safari first. You can always find this option later in Settings.",
      primaryButton: "Copy the link",
    },
  };

  const c = config[platform];

  return (
    <>
      <div
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "500px",
          maxWidth: "90vw",
          backgroundColor: "#fff",
          borderRadius: "12px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflow: "hidden",
          fontFamily: "'DM Sans', 'Satoshi', system-ui, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          padding: "40px 32px 32px",
        }}
      >
        {/* Icon */}
        <div style={{ marginBottom: 20 }}>{c.icon}</div>

        {/* Title */}
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "20px",
            fontWeight: 600,
            color: "#1a1a1a",
            textAlign: "center",
            fontFamily: "'Satoshi', 'DM Sans', system-ui, sans-serif",
          }}
        >
          {c.title}
        </h2>

        {/* Description */}
        <p
          style={{
            margin: "0 0 28px",
            fontSize: "14px",
            lineHeight: 1.5,
            color: "#666",
            textAlign: "center",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            maxWidth: "360px",
          }}
        >
          {c.description}
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <button
            onClick={handlePrimaryAction}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--selectedSpaceColor, #d36433)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Satoshi', 'DM Sans', system-ui, sans-serif",
              minWidth: "140px",
            }}
          >
            {c.primaryButton}
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Satoshi', 'DM Sans', system-ui, sans-serif",
              minWidth: "140px",
            }}
          >
            May be later
          </button>
        </div>
      </div>
    </>
  );
}
