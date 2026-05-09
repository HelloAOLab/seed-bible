const notificationColors: any = {
  warning: {
    bgColor: "#FFC107",
    color: "#fff",
    ICON: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/1a434287-4a50-4122-a7e9-f3c02382f7a6/fb482fe7bcb3b02d8a96583802a41489d9851e371141b8c7ed1d2a94131577e7.png",
  },
  success: {
    bgColor: "#4CAF50",
    color: "#fff",
    ICON: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/1a434287-4a50-4122-a7e9-f3c02382f7a6/f3e16cfd68004340a7af98f019cb3e06d0ca455df879b20e7423f12ea1e0dc3f.svg",
  },
  error: {
    bgColor: "#FFBABA",
    color: "#D8000C",
    ICON: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/1a434287-4a50-4122-a7e9-f3c02382f7a6/bddcad791459e1f00197446e3a81545ebfb4664e4ff7ccebde4b5dffebb292e8.png",
  },
};

const message = that?.message;
const severity = that?.severity;
const onUndoActions = that?.onUndoActions || false;

const { bgColor, color, ICON } =
  notificationColors[severity] || notificationColors.error;

const FloatingBanner = thisBot.FloatingBanner();
const G = globalThis as any;
if (!message) return;

if (G.TOAST_NOTIFICATION_TIMEOUT) {
  clearTimeout(G.TOAST_NOTIFICATION_TIMEOUT);
  G.TOAST_NOTIFICATION_TIMEOUT = null;
}

os.unregisterApp("toast-notification");
os.registerApp("toast-notification", thisBot);

const Notification = () => {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <FloatingBanner>
        <img
          src={ICON}
          alt="notification"
          style={{ width: "20px", height: "20px" }}
        />
        {message}
        <div
          style={{
            display: "flex",
            marginLeft: "auto",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {onUndoActions && (
            <p
              style={{
                cursor: "pointer",
                color: "var(--secondaryColor)",
                fontSize: "14px",
                margin: "0",
              }}
              onClick={onUndoActions}
            >
              Undo
            </p>
          )}
          <span
            style={{ cursor: "pointer", color: "var(--secondaryColor)" }}
            onClick={() => os.unregisterApp("toast-notification")}
            class="material-symbols-outlined"
          >
            close
          </span>
        </div>
      </FloatingBanner>
    </>
  );
};

const timeoutTime = message.length * 150;

G.TOAST_NOTIFICATION_TIMEOUT = setTimeout(() => {
  os.unregisterApp("toast-notification");
}, timeoutTime);

os.compileApp("toast-notification", <Notification />);
