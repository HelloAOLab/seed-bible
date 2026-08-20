import type { LoginManager } from "../../managers/LoginManager";
import { useI18n } from "../../i18n";
import { useMemo } from "preact/hooks";

export const Header = (props: { login: LoginManager }) => {
  const username = props.login.profile.value?.name;
  const { t, language } = useI18n();

  const { date, greeting } = useMemo(() => {
    const now = new Date();
    const month = now
      .toLocaleString(language, { month: "short" })
      .toUpperCase();
    const hour = now.getHours();
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

    return { date: `${now.getDate()} ${month}`, greeting };
  }, [language, t]);

  return (
    <div className="sb-today-header">
      <span>{date}</span>
      <h1>
        {greeting}, <span>{username || "Guest"}!</span>
      </h1>
    </div>
  );
};
