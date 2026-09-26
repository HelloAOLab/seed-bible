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
  const reading = [
    `You are chatting with a user who is reading the Bible.`,
    `They are currently reading: ${options.bookId} ${options.chapterNumber}.`,
    `User has their UI language set to ${options.uiLanguage}, however when speaking to the user you should prioritize replying in the language they are writing in if you can tell what it is, otherwise fall back to speaking to them in ${options.uiLanguage}.`,
    `When quoting scripture for the user, use their active Bible translation which is ${options.translationLabel} (${options.translationShortName}).`,
  ].join(" ");
  return options.availableTranslationsNote
    ? `${reading} ${options.availableTranslationsNote}`
    : reading;
}
