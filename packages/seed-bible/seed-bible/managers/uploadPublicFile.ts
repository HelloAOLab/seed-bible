import type { CasualOSManager } from "./OsManager";

/**
 * Uploads a file to the signed-in user's record with public-read access, the
 * same way profile pictures are stored. Returns the URL of the stored file.
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

/** Uploads a cover image for the signed-in user. Throws if signed out. */
export async function uploadCoverImageForUser(
  os: Pick<CasualOSManager, "recordFile">,
  userId: string | null | undefined,
  file: File
): Promise<string> {
  if (!userId) {
    throw new Error("Cannot upload a cover image while signed out.");
  }
  return uploadPublicFile(os, userId, file);
}

/**
 * Resolves a cover-image upload. Prefers `os` + `userId` (always present on
 * app state) so the UI still works when a long-lived manager instance was
 * created before it exposed `uploadHeroImage`.
 */
export async function resolveCoverImageUpload(
  file: File,
  options: {
    os?: Pick<CasualOSManager, "recordFile">;
    userId?: string | null;
    upload?: (file: File) => Promise<string>;
  }
): Promise<string> {
  if (options.os && options.userId) {
    return uploadPublicFile(options.os, options.userId, file);
  }
  if (typeof options.upload === "function") {
    return options.upload(file);
  }
  throw new Error(
    options.userId
      ? "Failed to upload file"
      : "Cannot upload a cover image while signed out."
  );
}
