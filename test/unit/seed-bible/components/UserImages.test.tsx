import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { UserImagesGrid } from "@packages/seed-bible/seed-bible/components/YourContentPane/UserImages";
import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { GalleryPhoto } from "@packages/seed-bible/seed-bible/managers/UserGalleryManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function photo(id: string, createdAtMs = 1_762_041_600_000): GalleryPhoto {
  return { id, url: `https://example.com/${id}.jpg`, createdAtMs };
}

interface CoverUser {
  title: string | null;
  heroImageUrl: string | null;
}

interface StateOptions {
  photos?: GalleryPhoto[];
  playlists?: CoverUser[];
  readingPlans?: CoverUser[];
  /** Makes the gallery delete fail, so the dialog has to report it. */
  deleteError?: Error;
  /** Makes clearing playlist covers fail, which must stop the delete. */
  clearPlaylistsError?: Error;
  /**
   * What the records server returns for a photo's file: its contents, or
   * null for a URL it doesn't store. Defaults to null.
   */
  readFile?: (url: string) => Promise<Blob | null>;
}

function createState(options: StateOptions = {}) {
  const photos = signal<GalleryPhoto[]>(options.photos ?? []);
  const deletePhoto = vi.fn(async (target: GalleryPhoto) => {
    if (options.deleteError) {
      throw options.deleteError;
    }
    photos.value = photos.value.filter((p) => p.id !== target.id);
  });
  const clearPlaylistCovers = vi.fn(async (_url: string) => {
    if (options.clearPlaylistsError) {
      throw options.clearPlaylistsError;
    }
    return [];
  });
  const clearPlanCovers = vi.fn(async (_url: string) => {});
  const toast = vi.fn((_message: string) => {});
  const modals = createModalManager();
  const readFile = vi.fn(options.readFile ?? (async (_url: string) => null));

  const state = {
    gallery: { photos, deletePhoto },
    playlists: {
      userPlaylists: signal(options.playlists ?? []),
      clearHeroImage: clearPlaylistCovers,
    },
    readingPlans: {
      userReadingPlans: signal(options.readingPlans ?? []),
      clearHeroImage: clearPlanCovers,
    },
    modals,
    app: { toast },
    os: { readFile },
  } as unknown as SeedBibleState;

  return {
    state,
    photos,
    deletePhoto,
    clearPlaylistCovers,
    clearPlanCovers,
    toast,
    modals,
    readFile,
  };
}

/** Stand-in for the modal host's `t`: the English default, like the mock i18n. */
const t = (key: string, options?: Record<string, unknown>) =>
  (options?.defaultValue as string | undefined) ?? key;

/** Lets the confirm handler's chain of awaits run to the end. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

/** Reads the gallery the way "Your content" does, so a delete re-renders. */
function Grid(props: { state: SeedBibleState }) {
  return (
    <UserImagesGrid
      state={props.state}
      photos={props.state.gallery.photos.value}
    />
  );
}

describe("UserImagesGrid", () => {
  let container: HTMLDivElement;
  let modalContainer: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    modalContainer = document.createElement("div");
    document.body.append(container, modalContainer);
  });

  afterEach(() => {
    render(null, container);
    render(null, modalContainer);
    container.remove();
    modalContainer.remove();
  });

  function renderPane(state: SeedBibleState) {
    act(() => {
      render(<Grid state={state} />, container);
    });
  }

  /** Renders the topmost open modal's body the way the modal host would. */
  function renderTopModal(modals: ModalManager) {
    const modal = modals.modals.value.at(-1);
    expect(modal).toBeDefined();
    act(() => {
      render(<>{modal!.content({ t })}</>, modalContainer);
    });
  }

  function clickDelete(index = 0) {
    const buttons =
      container.querySelectorAll<HTMLButtonElement>(".sb-images-delete");
    act(() => {
      buttons[index]!.click();
    });
  }

  async function confirmDelete() {
    await act(async () => {
      modalContainer
        .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
        .click();
      await settle();
    });
  }

  it("shows one tile per uploaded image, in gallery order", () => {
    const { state } = createState({ photos: [photo("a"), photo("b")] });
    renderPane(state);

    const images = Array.from(
      container.querySelectorAll<HTMLImageElement>(".sb-images-tile img")
    );
    expect(images.map((img) => img.src)).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });

  it("asks for confirmation first and names the covers that use the image", () => {
    const a = photo("a");
    const { state, deletePhoto, modals } = createState({
      photos: [a],
      playlists: [
        { title: "Morning", heroImageUrl: a.url },
        { title: "Other", heroImageUrl: "https://example.com/other.jpg" },
      ],
      readingPlans: [{ title: null, heroImageUrl: a.url }],
    });
    renderPane(state);

    clickDelete();

    expect(deletePhoto).not.toHaveBeenCalled();
    expect(modals.modals.value).toHaveLength(1);
    expect(modals.modals.value[0]!.mobileSheet).toBe(true);
    renderTopModal(modals);
    const text = modalContainer.textContent ?? "";
    expect(text).toContain("it will be removed from there too");
    expect(text).toContain("Morning");
    expect(text).toContain("Untitled plan");
    expect(text).not.toContain("Other");
  });

  it("clears the covers before deleting the image once confirmed", async () => {
    const a = photo("a");
    const { state, deletePhoto, clearPlaylistCovers, clearPlanCovers, toast } =
      createState({ photos: [a] });
    const { modals } = state;
    renderPane(state);
    clickDelete();
    renderTopModal(modals);

    await confirmDelete();

    expect(clearPlaylistCovers).toHaveBeenCalledWith(a.url);
    expect(clearPlanCovers).toHaveBeenCalledWith(a.url);
    expect(deletePhoto).toHaveBeenCalledWith(a);
    expect(clearPlaylistCovers.mock.invocationCallOrder[0]).toBeLessThan(
      deletePhoto.mock.invocationCallOrder[0]!
    );
    expect(modals.modals.value).toEqual([]);
    expect(toast).not.toHaveBeenCalled();
    expect(container.querySelectorAll(".sb-images-tile")).toHaveLength(0);
  });

  it("keeps the image and reports it when the delete fails", async () => {
    const a = photo("a");
    const { state, toast, modals } = createState({
      photos: [a],
      deleteError: new Error("offline"),
    });
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    renderPane(state);
    clickDelete();
    renderTopModal(modals);

    await confirmDelete();

    expect(toast).toHaveBeenCalledWith("Couldn't delete the image.");
    expect(modals.modals.value).toHaveLength(1);
    expect(container.querySelectorAll(".sb-images-tile")).toHaveLength(1);
    errorSpy.mockRestore();
  });

  it("does not delete the image when one of its covers cannot be cleared", async () => {
    const a = photo("a");
    const { state, deletePhoto, toast, modals } = createState({
      photos: [a],
      clearPlaylistsError: new Error("offline"),
    });
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    renderPane(state);
    clickDelete();
    renderTopModal(modals);

    await confirmDelete();

    expect(deletePhoto).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Couldn't delete the image.");
    expect(container.querySelectorAll(".sb-images-tile")).toHaveLength(1);
    errorSpy.mockRestore();
  });

  it("cancelling closes the confirmation without deleting", () => {
    const a = photo("a");
    const { state, deletePhoto, modals } = createState({ photos: [a] });
    renderPane(state);
    clickDelete();
    renderTopModal(modals);

    act(() => {
      modalContainer
        .querySelector<HTMLButtonElement>(".sb-session-settings-cancel")!
        .click();
    });

    expect(modals.modals.value).toEqual([]);
    expect(deletePhoto).not.toHaveBeenCalled();
  });

  it("opens a full-size preview from a tile, with a way in to delete", () => {
    const a = photo("a");
    const { state, modals } = createState({ photos: [a] });
    renderPane(state);

    act(() => {
      container.querySelector<HTMLButtonElement>(".sb-images-tile")!.click();
    });

    expect(modals.modals.value).toHaveLength(1);
    expect(modals.modals.value[0]!.mobileSheet).toBe(true);
    renderTopModal(modals);
    expect(
      modalContainer.querySelector<HTMLImageElement>(".sb-images-preview-img")
        ?.src
    ).toBe(a.url);

    act(() => {
      modalContainer
        .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
        .click();
    });

    // The preview gives way to the confirmation rather than stacking on it.
    expect(modals.modals.value.map((modal) => modal.id)).toEqual([
      `delete-image-confirm-${a.id}`,
    ]);
  });

  describe("downloading from the preview", () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      // jsdom has no object URLs; `download` only needs one to hand the link.
      URL.createObjectURL = vi.fn(() => "blob:test");
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    async function openPreviewAndDownload(
      a: GalleryPhoto,
      options: Pick<StateOptions, "readFile"> = {}
    ) {
      const { state, modals } = createState({ photos: [a], ...options });
      renderPane(state);
      act(() => {
        container.querySelector<HTMLButtonElement>(".sb-images-tile")!.click();
      });
      renderTopModal(modals);
      await act(async () => {
        modalContainer
          .querySelector<HTMLButtonElement>(".sb-images-preview-download")!
          .click();
        await settle();
      });
    }

    /** Records the file name each download link is clicked with. */
    function captureSaves(): string[] {
      const savedAs: string[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        function (this: HTMLAnchorElement) {
          savedAs.push(this.download);
        }
      );
      return savedAs;
    }

    it("saves a records-server image read through CasualOS", async () => {
      const a = photo("a");
      const fetchImage = vi.fn();
      vi.stubGlobal("fetch", fetchImage);
      const savedAs = captureSaves();
      const openTab = vi.spyOn(window, "open").mockImplementation(() => null);

      await openPreviewAndDownload(a, {
        readFile: async () => new Blob(["image"], { type: "image/jpeg" }),
      });

      expect(savedAs).toEqual(["a.jpg"]);
      expect(fetchImage).not.toHaveBeenCalled();
      expect(openTab).not.toHaveBeenCalled();
    });

    it("fetches an image hosted elsewhere, skipping the cache", async () => {
      const a = photo("a");
      const fetchImage = vi.fn(
        async () => new Response(new Blob(["image"], { type: "image/jpeg" }))
      );
      vi.stubGlobal("fetch", fetchImage);
      const savedAs = captureSaves();
      const openTab = vi.spyOn(window, "open").mockImplementation(() => null);

      await openPreviewAndDownload(a);

      expect(fetchImage).toHaveBeenCalledWith(a.url, { cache: "no-store" });
      expect(savedAs).toEqual(["a.jpg"]);
      expect(openTab).not.toHaveBeenCalled();
    });

    it("keeps a GIF or WebP's own file name", async () => {
      const savedAs = captureSaves();
      vi.spyOn(window, "open").mockImplementation(() => null);

      for (const [id, type] of [
        ["anim.gif", "image/gif"],
        ["still.webp", "image/webp"],
      ] as const) {
        await openPreviewAndDownload(
          { ...photo(id), url: `https://example.com/${id}` },
          { readFile: async () => new Blob(["image"], { type }) }
        );
      }

      expect(savedAs).toEqual(["anim.gif", "still.webp"]);
    });

    it("names a file without one after its image type", async () => {
      const savedAs = captureSaves();
      vi.spyOn(window, "open").mockImplementation(() => null);

      for (const type of ["image/gif", "image/webp", "image/svg+xml"]) {
        await openPreviewAndDownload(
          { ...photo("a"), url: "https://example.com/files/a" },
          { readFile: async () => new Blob(["image"], { type }) }
        );
      }

      expect(savedAs).toEqual([
        "seed-bible-image.gif",
        "seed-bible-image.webp",
        "seed-bible-image.svg",
      ]);
    });

    it("opens the image in a new tab when it can't be fetched", async () => {
      const a = photo("a");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("Failed to fetch");
        })
      );
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const openTab = vi.spyOn(window, "open").mockImplementation(() => null);

      await openPreviewAndDownload(a);

      expect(openTab).toHaveBeenCalledWith(a.url, "_blank", "noopener");
    });
  });
});
