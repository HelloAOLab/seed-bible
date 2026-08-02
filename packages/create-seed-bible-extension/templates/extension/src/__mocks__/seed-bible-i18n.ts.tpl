// Test-time stand-in for "seed-bible/i18n" — see seed-bible.ts in this
// directory for why this exists.
export function useI18n(): { t: (key: string) => string } {
  return { t: (key: string) => key };
}

export function addTranslations(): void {}

export const i18n = {};
