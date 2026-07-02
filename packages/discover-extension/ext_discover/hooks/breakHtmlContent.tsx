export function breakHtmlContent(htmlContent: string) {
  return htmlContent.replaceAll(
    `<p style="text-align: left;"></p>`,
    `<br style="text-align: left;"></br>`
  );
}

export function htmlContentHasMedia(htmlContent: string) {
  return (
    htmlContent.includes("img") ||
    htmlContent.includes("video") ||
    htmlContent.includes("iframe") ||
    htmlContent.includes("audio")
  );
}
