declare const t: (key: string) => string;
export function Widget() {
  return (
    <span>
      {t("used-key")} {t("plural-key")}
    </span>
  );
}
