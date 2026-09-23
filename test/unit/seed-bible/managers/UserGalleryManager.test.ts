import { signal } from "@preact/signals";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import {
  GalleryPhotoSchema,
  MAX_RECENT_GALLERY_PHOTOS,
  USER_GALLERY_CACHE_PREFIX,
  USER_GALLERY_MARKER,
  createUserGalleryManager,
  mergeGalleryPhotos,
  rememberPhotoInGallery,
  savePhotoToGallery,
  uploadPhotoToGallery,
} from "@packages/seed-bible/seed-bible/managers/UserGalleryManager";

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

type GalleryOs = Pick<
  CasualOSManager,
  "recordFile" | "recordData" | "listAllDataByMarker"
>;

type GalleryOsMock = {
  recordFile: ReturnType<typeof vi.fn>;
  recordData: ReturnType<typeof vi.fn>;
  listAllDataByMarker: ReturnType<typeof vi.fn>;
};

function makeOs(
  overrides: Partial<GalleryOsMock> = {}
): GalleryOsMock & GalleryOs {
  return {
    recordFile:
      overrides.recordFile ??
      vi.fn().mockResolvedValue({
        success: true,
        url: "https://example.com/photo.jpg",
      }),
    recordData: overrides.recordData ?? vi.fn().mockResolvedValue(undefined),
    listAllDataByMarker:
      overrides.listAllDataByMarker ??
      vi.fn().mockResolvedValue({ success: true, items: [] }),
  } as GalleryOsMock & GalleryOs;
}

describe("savePhotoToGallery", () => {
  it("uploads the file and records it in the user's gallery", async () => {
    const os = makeOs();
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    const photo = await savePhotoToGallery(os, "user-1", file);

    expect(photo.url).toBe("https://example.com/photo.jpg");
    expect(photo.id).toMatch(/^photo_/);
    expect(os.recordFile).toHaveBeenCalledWith("user-1", file, {
      mimeType: "image/jpeg",
      marker: "publicRead",
    });
    expect(os.recordData).toHaveBeenCalledWith("user-1", photo.id, photo, {
      marker: USER_GALLERY_MARKER,
    });
  });

  it("returns the existing gallery item when the uploaded URL is already saved", async () => {
    const existing = GalleryPhotoSchema.parse({
      id: "photo_existing",
      url: "https://example.com/photo.jpg",
      createdAtMs: 1,
    });
    const os = makeOs();
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    await expect(
      savePhotoToGallery(os, "user-1", file, [existing])
    ).resolves.toMatchObject({
      id: "photo_existing",
      url: "https://example.com/photo.jpg",
    });
    expect(os.recordData).toHaveBeenCalledTimes(1);
    const saved = os.recordData.mock.calls[0]![2];
    expect(saved.createdAtMs).toBeGreaterThan(existing.createdAtMs);
  });
});

describe("uploadPhotoToGallery", () => {
  it("saves through the gallery manager when one is provided", async () => {
    const savePhoto = vi.fn().mockResolvedValue({
      id: "photo_1",
      url: "https://example.com/gallery.jpg",
      createdAtMs: 1,
    });
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    await expect(
      uploadPhotoToGallery(file, { gallery: { savePhoto } })
    ).resolves.toBe("https://example.com/gallery.jpg");
    expect(savePhoto).toHaveBeenCalledWith(file);
  });

  it("uploads and records the photo when only os is provided", async () => {
    const os = makeOs();
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    const url = await uploadPhotoToGallery(file, {
      os,
      userId: "user-1",
    });

    expect(url).toBe("https://example.com/photo.jpg");
    expect(os.recordFile).toHaveBeenCalled();
    expect(os.recordData).toHaveBeenCalled();
    expect(os.recordData.mock.calls[0]![3]).toEqual({
      marker: USER_GALLERY_MARKER,
    });
  });

  it("records the uploaded URL in Recent uploads when only a file upload is available", async () => {
    const rememberPhoto = vi.fn().mockResolvedValue({
      id: "photo_1",
      url: "https://example.com/fallback.jpg",
      createdAtMs: 1,
    });
    const fallbackUpload = vi
      .fn()
      .mockResolvedValue("https://example.com/fallback.jpg");
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    await expect(
      uploadPhotoToGallery(file, {
        gallery: { rememberPhoto },
        fallbackUpload,
      })
    ).resolves.toBe("https://example.com/fallback.jpg");
    expect(fallbackUpload).toHaveBeenCalledWith(file);
    expect(rememberPhoto).toHaveBeenCalledWith(
      "https://example.com/fallback.jpg"
    );
  });
});

describe("createUserGalleryManager", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("loads the user's photos on sign-in and clears them on sign-out", async () => {
    const stored = {
      id: "photo_1",
      url: "https://example.com/saved.jpg",
      createdAtMs: 50,
    };
    const listAllDataByMarker = vi.fn().mockResolvedValue({
      success: true,
      items: [{ data: stored }],
    });
    const userId = signal<string | null>("user-1");
    const gallery = createUserGalleryManager(makeOs({ listAllDataByMarker }), {
      userId,
    });
    await flush();

    expect(gallery.photos.value).toEqual([stored]);
    expect(listAllDataByMarker).toHaveBeenCalledWith(
      "user-1",
      USER_GALLERY_MARKER
    );

    userId.value = null;
    await flush();
    expect(gallery.photos.value).toEqual([]);
  });

  it("keeps a just-saved photo when a slow gallery list returns without it", async () => {
    let resolveList: (value: { success: true; items: [] }) => void;
    const listAllDataByMarker = vi.fn(
      () =>
        new Promise<{ success: true; items: [] }>((resolve) => {
          resolveList = resolve;
        })
    );
    const recordFile = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/new.jpg",
    });
    const gallery = createUserGalleryManager(
      makeOs({ recordFile, listAllDataByMarker }),
      { userId: signal("user-1") }
    );
    const photo = await gallery.savePhoto(
      new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
    );

    expect(gallery.photos.value[0]).toEqual(photo);

    resolveList!({ success: true, items: [] });
    await flush();

    expect(gallery.photos.value.map((item) => item.url)).toContain(
      "https://example.com/new.jpg"
    );
  });

  it("savePhoto stores the file in the gallery and prepends it locally", async () => {
    const recordFile = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/new.jpg",
    });
    const recordData = vi.fn().mockResolvedValue(undefined);
    const gallery = createUserGalleryManager(
      makeOs({ recordFile, recordData }),
      { userId: signal("user-1") }
    );
    await flush();
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    const photo = await gallery.savePhoto(file);

    expect(photo.url).toBe("https://example.com/new.jpg");
    expect(gallery.photos.value[0]).toEqual(photo);
    expect(recordData).toHaveBeenCalledWith("user-1", photo.id, photo, {
      marker: USER_GALLERY_MARKER,
    });
  });

  it("savePhoto throws when signed out", async () => {
    const gallery = createUserGalleryManager(makeOs(), {
      userId: signal(null),
    });
    await flush();

    await expect(
      gallery.savePhoto(
        new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
      )
    ).rejects.toThrow("Cannot save a photo while signed out.");
  });

  it("rememberPhoto adds a used cover URL and moves it to the front on reuse", async () => {
    const recordData = vi.fn().mockResolvedValue(undefined);
    const gallery = createUserGalleryManager(makeOs({ recordData }), {
      userId: signal("user-1"),
    });
    await flush();

    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const first = await gallery.rememberPhoto("https://example.com/used.jpg");
      expect(first?.url).toBe("https://example.com/used.jpg");
      expect(gallery.photos.value[0]).toEqual(first);

      const older = {
        id: "photo_old",
        url: "https://example.com/older.jpg",
        createdAtMs: 1,
      };
      gallery.photos.value = [older, first!];

      vi.setSystemTime(2_000);
      const reused = await gallery.rememberPhoto(
        "https://example.com/used.jpg"
      );

      expect(reused?.id).toBe(first?.id);
      expect(gallery.photos.value[0]?.id).toBe(first?.id);
      expect(gallery.photos.value[0]?.createdAtMs).toBe(2_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rememberPhoto does nothing when signed out", async () => {
    const recordData = vi.fn();
    const gallery = createUserGalleryManager(makeOs({ recordData }), {
      userId: signal(null),
    });
    await flush();

    await expect(
      gallery.rememberPhoto("https://example.com/used.jpg")
    ).resolves.toBeNull();
    expect(recordData).not.toHaveBeenCalled();
  });

  it("rememberPhoto ignores a blank URL", async () => {
    const recordData = vi.fn();
    const gallery = createUserGalleryManager(makeOs({ recordData }), {
      userId: signal("user-1"),
    });
    await flush();

    await expect(gallery.rememberPhoto("   ")).resolves.toBeNull();
    expect(recordData).not.toHaveBeenCalled();
    expect(gallery.photos.value).toEqual([]);
  });

  it("does not keep a photo locally when recording it in the gallery fails", async () => {
    const recordData = vi.fn().mockResolvedValue({ success: false });
    const gallery = createUserGalleryManager(makeOs({ recordData }), {
      userId: signal("user-1"),
    });
    await flush();

    await expect(
      gallery.savePhoto(
        new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
      )
    ).rejects.toThrow("Failed to save photo to gallery");
    expect(gallery.photos.value).toEqual([]);
    expect(
      JSON.parse(
        localStorage.getItem(`${USER_GALLERY_CACHE_PREFIX}user-1`) ?? "[]"
      )
    ).toEqual([]);
  });

  it("caps Recent uploads at the most recent photos", async () => {
    let n = 0;
    const recordFile = vi.fn().mockImplementation(async () => {
      n += 1;
      return { success: true, url: `https://example.com/photo-${n}.jpg` };
    });
    const gallery = createUserGalleryManager(makeOs({ recordFile }), {
      userId: signal("user-1"),
    });
    await flush();
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    for (let i = 0; i < MAX_RECENT_GALLERY_PHOTOS + 2; i += 1) {
      await gallery.savePhoto(file);
    }

    expect(gallery.photos.value).toHaveLength(MAX_RECENT_GALLERY_PHOTOS);
    expect(gallery.photos.value[0]?.url).toBe(
      `https://example.com/photo-${MAX_RECENT_GALLERY_PHOTOS + 2}.jpg`
    );
    expect(
      gallery.photos.value.some(
        (photo) => photo.url === "https://example.com/photo-1.jpg"
      )
    ).toBe(false);
  });

  it("loads listed photos whose timestamps were stored as strings", async () => {
    const listAllDataByMarker = vi.fn().mockResolvedValue({
      success: true,
      items: [
        {
          data: {
            id: "photo_1",
            url: "https://example.com/saved.jpg",
            createdAtMs: "50",
          },
        },
      ],
    });
    const gallery = createUserGalleryManager(makeOs({ listAllDataByMarker }), {
      userId: signal("user-1"),
    });
    await flush();

    expect(gallery.photos.value).toEqual([
      {
        id: "photo_1",
        url: "https://example.com/saved.jpg",
        createdAtMs: 50,
      },
    ]);
  });

  it("shows a cached upload immediately when the network list is still empty", async () => {
    const listAllDataByMarker = vi.fn().mockResolvedValue({
      success: true,
      items: [],
    });
    const first = createUserGalleryManager(makeOs({ listAllDataByMarker }), {
      userId: signal("user-1"),
    });
    await flush();
    await first.savePhoto(
      new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
    );
    expect(first.photos.value[0]?.url).toBe("https://example.com/photo.jpg");

    const second = createUserGalleryManager(makeOs({ listAllDataByMarker }), {
      userId: signal("user-1"),
    });
    await flush();

    expect(second.photos.value.map((photo) => photo.url)).toContain(
      "https://example.com/photo.jpg"
    );
  });

  it("keeps local uploads when listing gallery records fails", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const listAllDataByMarker = vi
      .fn()
      .mockResolvedValue({ success: false, items: [] });
    const gallery = createUserGalleryManager(makeOs({ listAllDataByMarker }), {
      userId: signal("user-1"),
    });
    await flush();
    await gallery.savePhoto(
      new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
    );

    await gallery.syncPhotos();

    expect(gallery.photos.value[0]?.url).toBe("https://example.com/photo.jpg");
    errorSpy.mockRestore();
  });
});

describe("mergeGalleryPhotos", () => {
  it("keeps one row per URL and prefers the newest", () => {
    expect(
      mergeGalleryPhotos(
        [
          {
            id: "old",
            url: "https://example.com/a.jpg",
            createdAtMs: 1,
          },
        ],
        [
          {
            id: "new",
            url: "https://example.com/a.jpg",
            createdAtMs: 2,
          },
          {
            id: "other",
            url: "https://example.com/b.jpg",
            createdAtMs: 3,
          },
        ]
      )
    ).toEqual([
      {
        id: "other",
        url: "https://example.com/b.jpg",
        createdAtMs: 3,
      },
      {
        id: "new",
        url: "https://example.com/a.jpg",
        createdAtMs: 2,
      },
    ]);
  });
});

describe("rememberPhotoInGallery", () => {
  it("rejects an empty URL", async () => {
    const os = makeOs();
    await expect(rememberPhotoInGallery(os, "user-1", "  ")).rejects.toThrow(
      "Cannot save an empty photo URL to gallery"
    );
    expect(os.recordData).not.toHaveBeenCalled();
  });
});
