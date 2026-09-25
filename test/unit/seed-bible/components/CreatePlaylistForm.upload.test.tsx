import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CreatePlaylistForm } from "@packages/seed-bible/seed-bible/components/CreatePlaylistForm/CreatePlaylistForm";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type {
  Playlist,
  PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { createUserGalleryManager } from "@packages/seed-bible/seed-bible/managers/UserGalleryManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

vi.mock(
  "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput",
  () => ({
    PlaylistItemInput: () => <div className="stub-playlist-item-input" />,
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/HeroImageField/HeroImageField",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@packages/seed-bible/seed-bible/components/HeroImageField/HeroImageField")
      >();
    return {
      ...actual,
      HeroImageField: (props: {
        onUpload: (file: File) => Promise<void>;
        onRemove: () => void;
      }) => (
        <button
          type="button"
          className="stub-hero-upload"
          onClick={() => {
            void props.onUpload(
              new File([new Uint8Array([1])], "cover.jpg", {
                type: "image/jpeg",
              })
            );
          }}
        >
          stub upload
        </button>
      ),
    };
  }
);

function createPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: null,
    description: null,
    items: [],
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides,
  };
}

describe("CreatePlaylistForm cover upload", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it("uploads through os when the playlist manager has no uploadHeroImage", async () => {
    const editingPlaylist = signal(createPlaylist());
    const updateEditingPlaylistMetadata = vi.fn(
      (
        updates: Partial<
          Pick<Playlist, "title" | "description" | "heroImageUrl">
        >
      ) => {
        const current = editingPlaylist.value;
        if (!current) return;
        editingPlaylist.value = { ...current, ...updates };
      }
    );
    const playlists = {
      editingPlaylist,
      updateEditingPlaylistMetadata,
      cancelEditingPlaylist: vi.fn(),
      saveEditingPlaylist: vi.fn().mockResolvedValue(undefined),
      addEditingPlaylistItem: vi.fn(),
      updateEditingPlaylistItem: vi.fn(),
      removeEditingPlaylistItem: vi.fn(),
      reorderEditingPlaylistItem: vi.fn(),
    } as unknown as PlaylistManager;
    const recordFile = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/uploaded.jpg",
    });
    const recordData = vi.fn().mockResolvedValue(undefined);

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={
            {
              tabs: signal([]),
              selectedTabId: signal(null),
            } as unknown as TabsManager
          }
          modals={createModalManager()}
          os={{ recordFile, recordData }}
          login={{ userId: signal<string | null>("user-1") }}
        />,
        container
      );
    });

    await act(async () => {
      (
        container.querySelector(".stub-hero-upload") as HTMLButtonElement
      ).click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(recordFile).toHaveBeenCalledWith("user-1", expect.any(File), {
      mimeType: "image/jpeg",
      marker: "publicRead",
    });
    expect(recordData).toHaveBeenCalledWith(
      "user-1",
      expect.stringMatching(/^photo_/),
      expect.objectContaining({ url: "https://example.com/uploaded.jpg" }),
      { marker: "publicRead:userGallery" }
    );
    expect(updateEditingPlaylistMetadata).toHaveBeenCalledWith({
      heroImageUrl: "https://example.com/uploaded.jpg",
    });
    expect(editingPlaylist.value?.heroImageUrl).toBe(
      "https://example.com/uploaded.jpg"
    );
  });

  it("saves the cover through the shared gallery so it can be reused", async () => {
    const editingPlaylist = signal(createPlaylist());
    const updateEditingPlaylistMetadata = vi.fn(
      (
        updates: Partial<
          Pick<Playlist, "title" | "description" | "heroImageUrl">
        >
      ) => {
        const current = editingPlaylist.value;
        if (!current) return;
        editingPlaylist.value = { ...current, ...updates };
      }
    );
    const playlists = {
      editingPlaylist,
      updateEditingPlaylistMetadata,
      cancelEditingPlaylist: vi.fn(),
      saveEditingPlaylist: vi.fn().mockResolvedValue(undefined),
      addEditingPlaylistItem: vi.fn(),
      updateEditingPlaylistItem: vi.fn(),
      removeEditingPlaylistItem: vi.fn(),
      reorderEditingPlaylistItem: vi.fn(),
    } as unknown as PlaylistManager;
    const savePhoto = vi.fn().mockResolvedValue({
      id: "photo_1",
      url: "https://example.com/gallery.jpg",
      createdAtMs: 1,
    });

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={
            {
              tabs: signal([]),
              selectedTabId: signal(null),
            } as unknown as TabsManager
          }
          modals={createModalManager()}
          gallery={{
            photos: signal([]),
            savePhoto,
            rememberPhoto: vi.fn(),
          }}
        />,
        container
      );
    });

    await act(async () => {
      (
        container.querySelector(".stub-hero-upload") as HTMLButtonElement
      ).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(savePhoto).toHaveBeenCalledTimes(1);
    expect(updateEditingPlaylistMetadata).toHaveBeenCalledWith({
      heroImageUrl: "https://example.com/gallery.jpg",
    });
  });

  it("keeps Recent uploads in the gallery manager after a cover upload", async () => {
    localStorage.clear();
    const editingPlaylist = signal(createPlaylist());
    const updateEditingPlaylistMetadata = vi.fn(
      (
        updates: Partial<
          Pick<Playlist, "title" | "description" | "heroImageUrl">
        >
      ) => {
        const current = editingPlaylist.value;
        if (!current) return;
        editingPlaylist.value = { ...current, ...updates };
      }
    );
    const playlists = {
      editingPlaylist,
      updateEditingPlaylistMetadata,
      cancelEditingPlaylist: vi.fn(),
      saveEditingPlaylist: vi.fn().mockResolvedValue(undefined),
      addEditingPlaylistItem: vi.fn(),
      updateEditingPlaylistItem: vi.fn(),
      removeEditingPlaylistItem: vi.fn(),
      reorderEditingPlaylistItem: vi.fn(),
    } as unknown as PlaylistManager;
    const gallery = createUserGalleryManager(
      {
        recordFile: vi.fn().mockResolvedValue({
          success: true,
          url: "https://example.com/gallery.jpg",
        }),
        recordData: vi.fn().mockResolvedValue(undefined),
        listAllDataByMarker: vi
          .fn()
          .mockResolvedValue({ success: true, items: [] }),
      },
      { userId: signal("user-1") }
    );

    act(() => {
      render(
        <CreatePlaylistForm
          playlists={playlists}
          tabs={
            {
              tabs: signal([]),
              selectedTabId: signal(null),
            } as unknown as TabsManager
          }
          modals={createModalManager()}
          gallery={gallery}
        />,
        container
      );
    });

    await act(async () => {
      (
        container.querySelector(".stub-hero-upload") as HTMLButtonElement
      ).click();
      for (let i = 0; i < 20; i += 1) {
        await Promise.resolve();
      }
    });

    expect(gallery.photos.value[0]?.url).toBe(
      "https://example.com/gallery.jpg"
    );
    expect(updateEditingPlaylistMetadata).toHaveBeenCalledWith({
      heroImageUrl: "https://example.com/gallery.jpg",
    });
    localStorage.clear();
  });
});
