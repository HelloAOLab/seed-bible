const notificationColors = {
    warning: {
        bgColor: '#FFC107',
        color: '#fff'
    },
    success: {
        bgColor: '#4CAF50',
        color: '#fff'
    },
    error: {
        bgColor: '#FFBABA',
        color: '#D8000C'
    }
};

const message = that?.message;
const severity = that?.severity;

const { bgColor, color } = notificationColors[severity] || notificationColors.error;

const FloatingBanner = thisBot.FloatingBanner();

if (!message) return;

if (globalThis.TOAST_NOTIFICATION_TIMEOUT) {
    clearTimeout(globalThis.TOAST_NOTIFICATION_TIMEOUT);
    globalThis.TOAST_NOTIFICATION_TIMEOUT = null;
}

os.unregisterApp("toast-notification");
os.registerApp("toast-notification");


const Notification = () => {
    return <FloatingBanner bgColor={bgColor} color={color} >
        {message}
    </FloatingBanner>
}

globalThis.TOAST_NOTIFICATION_TIMEOUT = setTimeout(() => {
    os.unregisterApp("toast-notification");
}, 1500);

os.compileApp("toast-notification", <Notification />);
