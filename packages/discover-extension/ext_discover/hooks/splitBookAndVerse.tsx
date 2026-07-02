export function splitBookAndVerse(text: string) {
  if (!text) return { book: text, verse: "" };

  const match = text.match(/^(.*?)(\s+\d+:\d+)$/);
  if (!match) {
    return { book: text, verse: "" };
  }

  return {
    book: match[1].trim(),
    verse: match[2].trim(),
  };
}
