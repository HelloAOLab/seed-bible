import { useTodayContext } from "../contexts/today/TodayContext";

const NOTIFICATION_ICON = "notifications";
const SETTINGS_ICON = "settings";

type UseHeader = () => {
  date: string;
  greeting: string;
  name: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
  notificationIcon: string;
  settingsIcon: string;
  handleNotificationClick: () => void;
  handleSettingsClick: () => void;
};

const { useMemo, useCallback } = os.appHooks;

export const useHeader: UseHeader = () => {
  const { language, username, MaterialIcon, translate } = useTodayContext();

  const { day, month, greeting } = useMemo(() => {
    const date = new Date();
    const day = date.getDate();
    const month = date
      .toLocaleString(language, { month: "short" })
      .toUpperCase();
    const hour = date.getHours();
    const greetingKey =
      hour >= 5 && hour < 12
        ? "greeting-morning"
        : hour >= 12 && hour < 18
          ? "greeting-afternoon"
          : hour >= 18 && hour < 21
            ? "greeting-evening"
            : "greeting-night";
    return {
      day,
      month,
      greeting: translate(greetingKey),
    };
  }, [language, translate]);

  const handleNotificationClick = useCallback(() => {
    console.log(`useHeader: handleNotificationClick`);
  }, []);

  const handleSettingsClick = useCallback(() => {
    console.log(`useHeader: handleSettingsClick`);
  }, []);

  return {
    date: `${day} ${month}`,
    greeting,
    name: username && username.length > 0 ? username : "Guest",
    MaterialIcon,
    notificationIcon: NOTIFICATION_ICON,
    settingsIcon: SETTINGS_ICON,
    handleNotificationClick,
    handleSettingsClick,
  };
};
