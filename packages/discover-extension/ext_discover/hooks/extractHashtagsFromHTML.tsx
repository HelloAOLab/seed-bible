export function extractHashtagsFromHTML(html: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.textContent || "";
  return [...new Set(text.match(hashtagRegex) || [])];
}
