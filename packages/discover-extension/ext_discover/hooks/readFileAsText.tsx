export function readFileAsText(
  file: Blob
): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result ?? null);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
