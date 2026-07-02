export function toPlainFile(file: File) {
  return {
    name: file.name,
    size: file.size,
    mimeType: file.type,
    lastModified: file.lastModified,
  };
}
