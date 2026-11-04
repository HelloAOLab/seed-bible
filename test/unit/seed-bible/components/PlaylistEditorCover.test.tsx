import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { PlaylistEditorScreen } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorScreen";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type {
  Playlist,
  PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { createUserGalleryManager } from "@packages/seed-bible/seed-bible/managers/UserGalleryManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { ChatsManager } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { waitFor } from "../testUtils/createTestSeedBibleState";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

// The real field, plus a button that hands it a picked picture as if it had
// come back from the crop modal (which needs a canvas jsdom doesn't have).
vi.mock(
  "@packages/seed-bible/seed-bible/components/HeroImageField/HeroImageField",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@packages/seed-bible/seed-bible/components/HeroImageField/HeroImageField")
      >();
    return {
      ...actual,
      HeroImageField: (props: Parameters<typeof actual.HeroImageField>[0]) => (
        <>
          <actual.HeroImageField {...props} />
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
        </>
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

function createPlaylists(playlist: Playlist) {
  const editingPlaylist = signal<Playlist | null>(playlist);
  const updateEditingPlaylistMetadata = vi.fn((updates: Partial<Playlist>) => {
    editingPlaylist.value = { ...editingPlaylist.value!, ...updates };
  });
  const playlists = {
    editingPlaylist,
    updateEditingPlaylistMetadata,
    userPlaylists: signal([]),
    isEditingPlaylistDirty: vi.fn(() => false),
    cancelEditingPlaylist: vi.fn(),
    saveEditingPlaylist: vi.fn().mockResolvedValue(undefined),
    addEditingPlaylistItem: vi.fn(),
    insertEditingPlaylistItem: vi.fn(),
    updateEditingPlaylistItem: vi.fn(),
    removeEditingPlaylistItem: vi.fn(),
    reorderEditingPlaylistItem: vi.fn(),
  } as unknown as PlaylistManager;
  return { playlists, editingPlaylist, updateEditingPlaylistMetadata };
}

describe("the playlist editor's cover", () => {
  let container: HTMLDivElement;
  const modals = createModalManager();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    modals.closeAllModals();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function renderEditor(
    playlists: PlaylistManager,
    state: Partial<Pick<SeedBibleState, "os" | "login" | "gallery">>
  ) {
    act(() => {
      render(
        <PlaylistEditorScreen
          state={
            {
              bibleData: undefined,
              app: { isMobile: signal(false) },
              ...state,
            } as unknown as SeedBibleState
          }
          playlists={playlists}
          tabs={
            {
              tabs: signal([]),
              selectedTabId: signal(null),
            } as unknown as TabsManager
          }
          modals={modals}
          chats={
            {
              providers: signal([]),
              chats: signal([]),
            } as unknown as ChatsManager
          }
          openChatPanel={vi.fn()}
        />,
        container
      );
    });
  }

  /** Opens the upload choice the cover field offers, returning its modal's host. */
  function openUploadChoice(root: ParentNode) {
    act(() => {
      root
        .querySelector<HTMLButtonElement>(".sb-hero-field-placeholder")!
        .click();
    });
    const modal = modals.modals.value.at(-1)!;
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      render(
        <>
          {modal.content({
            t: (key, options) => (options?.defaultValue as string) ?? key,
          })}
        </>,
        host
      );
    });
    return host;
  }

  it("offers to add a cover on a new playlist's details, from the gallery or an upload", () => {
    const { playlists } = createPlaylists(createPlaylist());
    renderEditor(playlists, {});

    expect(
      container.querySelector(".sb-hero-field-placeholder")?.textContent
    ).toContain("Add cover image");
    const host = openUploadChoice(container);
    const labels = Array.from(host.querySelectorAll("button")).map(
      (button) => button.textContent ?? ""
    );
    expect(labels.some((label) => label.includes("Choose from gallery"))).toBe(
      true
    );
    expect(labels.some((label) => label.includes("Upload a picture"))).toBe(
      true
    );
    render(null, host);
    host.remove();
  });

  it("shows the cover and takes it off when asked", () => {
    const { playlists, editingPlaylist } = createPlaylists(
      createPlaylist({ heroImageUrl: "https://example.com/cover.jpg" })
    );
    renderEditor(playlists, {});
    // A draft with a cover opens on its details only while it has no title.
    expect(container.querySelector(".sb-playlist-details")).not.toBeNull();

    expect(
      container.querySelector<HTMLImageElement>(".sb-hero-field-preview img")
        ?.src
    ).toBe("https://example.com/cover.jpg");
    const remove = container.querySelector<HTMLButtonElement>(
      ".sb-hero-field-clear"
    )!;
    expect(remove.getAttribute("aria-label")).toBe("Remove cover image");
    act(() => remove.click());

    expect(editingPlaylist.value?.heroImageUrl).toBeNull();
  });

  it("uploads through os when there is no gallery", async () => {
    const { playlists, editingPlaylist } = createPlaylists(createPlaylist());
    const recordFile = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/uploaded.jpg",
    });
    const recordData = vi.fn().mockResolvedValue(undefined);
    renderEditor(playlists, {
      os: { recordFile, recordData } as unknown as SeedBibleState["os"],
      login: {
        userId: signal<string | null>("user-1"),
      } as unknown as SeedBibleState["login"],
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".stub-hero-upload")!.click();
      await waitFor(() => editingPlaylist.value?.heroImageUrl != null);
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
    expect(editingPlaylist.value?.heroImageUrl).toBe(
      "https://example.com/uploaded.jpg"
    );
  });

  it("keeps an uploaded cover in the gallery's recent uploads, from the steps screen's cover button", async () => {
    const { playlists, editingPlaylist } = createPlaylists(
      createPlaylist({ title: "Hagar" })
    );
    const gallery = createUserGalleryManager(
      {
        recordFile: vi.fn().mockResolvedValue({
          success: true,
          url: "https://example.com/gallery.jpg",
        }),
        recordData: vi.fn().mockResolvedValue(undefined),
        eraseData: vi.fn().mockResolvedValue({ success: true }),
        eraseFile: vi.fn().mockResolvedValue({ success: true }),
        listAllDataByMarker: vi
          .fn()
          .mockResolvedValue({ success: true, items: [] }),
      },
      { userId: signal("user-1") }
    );
    renderEditor(playlists, { gallery });

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-editor-cover")!
        .click();
    });
    const coverModal = modals.modals.value.find(
      (m) => m.id === "playlist-editor-cover"
    )!;
    const coverHost = document.createElement("div");
    document.body.appendChild(coverHost);
    act(() => {
      render(<>{coverModal.content({ t: (key: string) => key })}</>, coverHost);
    });
    await act(async () => {
      coverHost.querySelector<HTMLButtonElement>(".stub-hero-upload")!.click();
      await waitFor(() => editingPlaylist.value?.heroImageUrl != null);
    });

    expect(gallery.photos.value[0]?.url).toBe(
      "https://example.com/gallery.jpg"
    );
    expect(editingPlaylist.value?.heroImageUrl).toBe(
      "https://example.com/gallery.jpg"
    );
    expect(
      container
        .querySelector(".sb-playlist-editor-cover img")
        ?.getAttribute("src")
    ).toBe("https://example.com/gallery.jpg");
    render(null, coverHost);
    coverHost.remove();
  });
});
