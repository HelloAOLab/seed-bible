import { useTodayContext } from "./TodayContext";

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

import { useMemo, useCallback } from "preact/hooks";

export const useHeader: UseHeader = () => {
  const { language, username, MaterialIcon, t } = useTodayContext();

  const { day, month, greeting } = useMemo(() => {
    const date = new Date();
    const day = date.getDate();
    const month = date
      .toLocaleString(language, { month: "short" })
      .toUpperCase();
    const hour = date.getHours();
    // Spelled out per branch rather than translating a computed key, so the
    // keys stay visible to the i18n lint rules and the usage scanner.
    const greeting =
      hour >= 5 && hour < 12
        ? t("greeting-morning", { defaultValue: "Good morning" })
        : hour >= 12 && hour < 18
          ? t("greeting-afternoon", { defaultValue: "Good afternoon" })
          : hour >= 18 && hour < 21
            ? t("greeting-evening", { defaultValue: "Good evening" })
            : t("greeting-night", { defaultValue: "Good night" });
    return {
      day,
      month,
      greeting,
    };
  }, [language, t]);

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
