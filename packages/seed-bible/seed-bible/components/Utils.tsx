import type { TranslatableTitle } from "../managers/BibleToolsManager";

/**
 * Translates a TranslatableTitle using the provided translation function.
 * @param t The translation function.
 * @param title The title to translate.
 * @returns The translated title string.
 */
export const translateTitle = (
  t: (key: string, options?: Record<string, unknown>) => string,
  title: TranslatableTitle
): string => {
  if (typeof title === "string") {
    return title;
  }
  return t(title.key, {
    defaultValue: title.defaultValue,
    ns: title.ns,
    ...title.options,
  });
};
