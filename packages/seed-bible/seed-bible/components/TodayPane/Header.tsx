import type { LoginManager } from "../../managers/LoginManager";
import { useI18n } from "../../i18n";
import { useMemo } from "preact/hooks";
import { useTimeContext } from "./TimeContext";
import { trimmedOrNull } from "../../managers/Utils";

/**
 * Stands in for the name while the greeting is translated, so the finished
 * sentence can be split around it. The name needs its own element to carry the
 * accent colour, but *where* it sits in the sentence is the translation's
 * business — a locale is free to lead with it. Interpolating a sentinel rather
 * than markup also keeps the name, which is user-supplied, out of any HTML. A
 * private-use code point, so it can never collide with anything a translator
 * might legitimately write.
 */
const NAME_PLACEHOLDER = "\uE000";

export const Header = (props: { login: LoginManager }) => {
  const username = trimmedOrNull(props.login.profile.value?.name);
  const { t, language } = useI18n();
  // `TimeProvider` re-renders this subtree every ten seconds so the date and
  // greeting stay current; without `tick` in the memo below they would be
  // fixed at whatever the clock said when Today was first opened.
  const { tick } = useTimeContext();

  const { date, greeting } = useMemo(() => {
    const now = new Date();
    const month = now
      .toLocaleString(language, { month: "short" })
      .toUpperCase();
    const hour = now.getHours();
    // Each greeting is one whole sentence, punctuation included, rather than a
    // bare phrase the JSX punctuates: a comma and "!" aren't universal (French
    // wants a space before "!", CJK wants fullwidth forms, Arabic its own
    // comma), and a translator may need the name somewhere other than last.
    // Spelled out per branch rather than translating a computed key, so the
    // keys stay visible to the i18n lint rules and the usage scanner.
    const greeting = username
      ? hour >= 5 && hour < 12
        ? t("greeting-morning-named", {
            name: NAME_PLACEHOLDER,
            defaultValue: "Good morning, {{name}}!",
          })
        : hour >= 12 && hour < 18
          ? t("greeting-afternoon-named", {
              name: NAME_PLACEHOLDER,
              defaultValue: "Good afternoon, {{name}}!",
            })
          : hour >= 18 && hour < 21
            ? t("greeting-evening-named", {
                name: NAME_PLACEHOLDER,
                defaultValue: "Good evening, {{name}}!",
              })
            : t("greeting-night-named", {
                name: NAME_PLACEHOLDER,
                defaultValue: "Good night, {{name}}!",
              })
      : hour >= 5 && hour < 12
        ? t("greeting-morning", { defaultValue: "Good morning!" })
        : hour >= 12 && hour < 18
          ? t("greeting-afternoon", { defaultValue: "Good afternoon!" })
          : hour >= 18 && hour < 21
            ? t("greeting-evening", { defaultValue: "Good evening!" })
            : t("greeting-night", { defaultValue: "Good night!" });

    return { date: `${now.getDate()} ${month}`, greeting };
  }, [language, t, tick, username]);

  // `after` is undefined when the sentence has no name in it — either nobody is
  // signed in, or a locale chose not to use the placeholder — and that is what
  // decides whether a name element is rendered at all.
  const [beforeName, afterName] = greeting.split(NAME_PLACEHOLDER);

  return (
    <div className="sb-today-header">
      <span>{date}</span>
      <h1>
        {beforeName}
        {afterName === undefined ? null : <span>{username}</span>}
        {afterName}
      </h1>
    </div>
  );
};
