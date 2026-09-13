import type { CasualOSManager } from "./OsManager";

/**
 * Uploads a file to the given record with public-read access and returns the
 * URL it was stored at. `LoginManager` stores profile pictures the same way,
 * through its own `os.recordFile` call, because it has to hold the upload
 * until the profile has loaded.
 */
export async function uploadPublicFile(
  os: Pick<CasualOSManager, "recordFile">,
  recordName: string,
  file: File
): Promise<string> {
  const result = await os.recordFile(recordName, file, {
    mimeType: file.type || "application/octet-stream",
    marker: "publicRead",
  });
  if (result.success === false) {
    throw new Error("Failed to upload file");
  }
  return result.url;
}
