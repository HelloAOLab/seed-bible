import { effect, signal } from "@preact/signals";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import { uploadPublicFile } from "./uploadPublicFile";

export const USER_GALLERY_MARKER = "publicRead:userGallery";
export const USER_GALLERY_CACHE_PREFIX = "seed-bible:user-gallery:";

/** How many recent photos the picker shows. */
export const MAX_RECENT_GALLERY_PHOTOS = 24;

export const GalleryPhotoSchema = z.object({
  id: z.string().min(1),
  // Listed records may not be a strict URL (CasualOS file URLs vary); empty
  // strings are the only thing we cannot show.
  url: z.string().min(1).max(2048),
  createdAtMs: z.coerce.number().positive(),
});

export type GalleryPhoto = z.infer<typeof GalleryPhotoSchema>;

export type UserGalleryManager = ReturnType<typeof createUserGalleryManager>;

function prependPhoto(
  list: readonly GalleryPhoto[],
  photo: GalleryPhoto
): GalleryPhoto[] {
  return [photo, ...list.filter((item) => item.id !== photo.id)].slice(
    0,
    MAX_RECENT_GALLERY_PHOTOS
  );
}

/** Newest-first, one row per URL, capped at {@link MAX_RECENT_GALLERY_PHOTOS}. */
export function mergeGalleryPhotos(
  ...groups: readonly (readonly GalleryPhoto[])[]
): GalleryPhoto[] {
  const byUrl = new Map<string, GalleryPhoto>();
  for (const group of groups) {
    for (const photo of group) {
      const existing = byUrl.get(photo.url);
      if (!existing || photo.createdAtMs >= existing.createdAtMs) {
        byUrl.set(photo.url, photo);
      }
    }
  }
  return [...byUrl.values()]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, MAX_RECENT_GALLERY_PHOTOS);
}

function readCachedGallery(userId: string): GalleryPhoto[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(USER_GALLERY_CACHE_PREFIX + userId);
    if (!raw) {
      return [];
    }
    const parsed = z.array(GalleryPhotoSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeCachedGallery(userId: string, photos: readonly GalleryPhoto[]) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(
      USER_GALLERY_CACHE_PREFIX + userId,
      JSON.stringify(photos.slice(0, MAX_RECENT_GALLERY_PHOTOS))
    );
  } catch {
    // Best-effort; CasualOS records are the durable source of truth.
  }
}

function commitPhotos(userId: string, next: GalleryPhoto[]): GalleryPhoto[] {
  const photos = mergeGalleryPhotos(next);
  writeCachedGallery(userId, photos);
  return photos;
}

/**
 * Records a photo URL in the gallery, or moves it to the front when it was
 * already saved (reuse counts as a recent upload).
 */
export async function rememberPhotoInGallery(
  os: Pick<CasualOSManager, "recordData">,
  userId: string,
  url: string,
  existing: readonly GalleryPhoto[] = []
): Promise<GalleryPhoto> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Cannot save an empty photo URL to gallery");
  }
  const found = existing.find((photo) => photo.url === trimmed);
  const photo: GalleryPhoto = found
    ? { ...found, createdAtMs: Date.now() }
    : {
        id: `photo_${uuid()}`,
        url: trimmed,
        createdAtMs: Date.now(),
      };
  const result = await os.recordData(userId, photo.id, photo, {
    marker: USER_GALLERY_MARKER,
  });
  if (
    result &&
    typeof result === "object" &&
    "success" in result &&
    result.success === false
  ) {
    throw new Error("Failed to save photo to gallery");
  }
  return photo;
}

/**
 * App-wide photo gallery helpers. Playlists use these today to save and reuse
 * covers; other features can call the same functions later.
 */
export async function savePhotoToGallery(
  os: Pick<CasualOSManager, "recordFile" | "recordData">,
  userId: string,
  file: File,
  existing: readonly GalleryPhoto[] = []
): Promise<GalleryPhoto> {
  const url = await uploadPublicFile(os, userId, file);
  return rememberPhotoInGallery(os, userId, url, existing);
}

/**
 * The single upload path for user photos: store the file and record its URL
 * in Recent uploads so any feature can reuse it. Prefers the gallery manager
 * (keeps the in-memory list in sync); otherwise uploads through CasualOS and
 * writes the gallery record itself.
 */
export async function uploadPhotoToGallery(
  file: File,
  options: {
    gallery?: Partial<
      Pick<UserGalleryManager, "savePhoto" | "rememberPhoto">
    > | null;
    os?: Pick<CasualOSManager, "recordFile" | "recordData">;
    userId?: string | null;
    fallbackUpload?: (file: File) => Promise<string>;
  }
): Promise<string> {
  if (typeof options.gallery?.savePhoto === "function") {
    return (await options.gallery.savePhoto(file)).url;
  }
  let url: string;
  if (options.os && options.userId) {
    url =
      typeof options.os.recordData === "function"
        ? (await savePhotoToGallery(options.os, options.userId, file)).url
        : await uploadPublicFile(options.os, options.userId, file);
  } else if (typeof options.fallbackUpload === "function") {
    url = await options.fallbackUpload(file);
  } else {
    throw new Error(
      options.userId
        ? "Failed to upload file"
        : "Cannot save a photo while signed out."
    );
  }
  // File-only fallbacks still have to land in Recent uploads so the shared
  // gallery can reuse the URL from playlists, plans, and later features.
  if (typeof options.gallery?.rememberPhoto === "function") {
    await options.gallery.rememberPhoto(url);
  }
  return url;
}

export function createUserGalleryManager(
  os: Pick<
    CasualOSManager,
    "recordFile" | "recordData" | "listAllDataByMarker"
  >,
  login: Pick<LoginManager, "userId">
) {
  const photos = signal<GalleryPhoto[]>([]);

  const listPhotos = async (recordName: string): Promise<GalleryPhoto[]> => {
    const records = await os.listAllDataByMarker(
      recordName,
      USER_GALLERY_MARKER
    );
    if (records.success === false) {
      throw new Error("Failed to list gallery photos");
    }
    return records.items
      .map((record) => GalleryPhotoSchema.safeParse(record.data))
      .filter((parsed) => parsed.success)
      .map((parsed) => parsed.data);
  };

  const syncPhotos = async () => {
    const userId = login.userId.value;
    if (!userId) {
      photos.value = [];
      return;
    }
    const cached = readCachedGallery(userId);
    if (photos.peek().length === 0 && cached.length > 0) {
      photos.value = cached;
    }
    try {
      const listed = await listPhotos(userId);
      photos.value = commitPhotos(
        userId,
        mergeGalleryPhotos(listed, cached, photos.peek())
      );
    } catch (error) {
      console.error("Failed to sync photo gallery:", error);
      if (photos.peek().length === 0 && cached.length > 0) {
        photos.value = cached;
      }
    }
  };

  /**
   * Puts a photo URL in Recent uploads (or moves it to the front if it is
   * already there) so recently used photos stay easy to reuse.
   */
  const rememberPhoto = async (url: string): Promise<GalleryPhoto | null> => {
    const userId = login.userId.value;
    const trimmed = url.trim();
    if (!userId || !trimmed) {
      return null;
    }
    const photo = await rememberPhotoInGallery(
      os,
      userId,
      trimmed,
      photos.peek()
    );
    photos.value = commitPhotos(userId, prependPhoto(photos.peek(), photo));
    return photo;
  };

  /**
   * The common save path for user photos (covers, and later anything else).
   * Uploads the file, records it in the gallery, and returns the stored photo.
   */
  const savePhoto = async (file: File): Promise<GalleryPhoto> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Cannot save a photo while signed out.");
    }
    const url = await uploadPublicFile(os, userId, file);
    const photo = await rememberPhoto(url);
    if (!photo) {
      throw new Error("Cannot save a photo while signed out.");
    }
    return photo;
  };

  effect(() => {
    void syncPhotos();
  });

  return {
    photos,
    savePhoto,
    rememberPhoto,
    syncPhotos,
  };
}
