/**
 * The system note Bonfire receives for one turn. Bonfire cannot call tools,
 * so the translations the reader could actually switch to are written out
 * here instead of being looked up with searchTranslations.
 */
export function buildBonfireCustomInstructions(options: {
  bookId: string | null | undefined;
  chapterNumber: number | null | undefined;
  translationLabel: string;
  translationShortName: string;
  uiLanguage: string;
  availableTranslationsNote: string | null;
}): string {
  const reading = `You are chatting with a user who is reading the Bible. They are currently reading: ${options.bookId} ${options.chapterNumber}. Prefer the Bible translation ${options.translationLabel} (${options.translationShortName}). Reply in ${options.uiLanguage}.`;
  if (!options.availableTranslationsNote) {
    return reading;
  }
  return `${reading} ${options.availableTranslationsNote}`;
}
