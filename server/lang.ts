export function parseAcceptLanguages(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [lang] = part.trim().split(";");
      return lang;
    })
    .filter(Boolean) as string[];
}
