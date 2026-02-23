const notificationColors: any = {
  warning: {
    bgColor: "#FFC107",
    color: "#fff",
  },
  success: {
    bgColor: "#4CAF50",
    color: "#fff",
  },
  error: {
    bgColor: "#FFBABA",
    color: "#D8000C",
  },
};

const message = that?.message;
const severity = that?.severity;

const { bgColor, color } =
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
    <FloatingBanner bgColor={bgColor} color={color}>
      {message}
    </FloatingBanner>
  );
};

const timeoutTime = message.length * 75;

G.TOAST_NOTIFICATION_TIMEOUT = setTimeout(() => {
  os.unregisterApp("toast-notification");
}, timeoutTime);

os.compileApp("toast-notification", <Notification />);
