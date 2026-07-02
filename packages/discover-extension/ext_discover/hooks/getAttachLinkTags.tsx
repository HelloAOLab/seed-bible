export function getAttachLinkTags(): string[] {
  const tags = ["SCRIPTURE", "TEXT", "LINK"];

  if (DEV_ENV) {
    tags.push("RECORDING");
    tags.push("FILE_UPLOAD");
    tags.push("PLAYLIST");
    tags.push("DATE");
    tags.push("TAG");
  }

  return tags;
}
