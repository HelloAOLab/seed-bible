import { render } from "preact";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import { act } from "preact/test-utils";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "./testUtils/mockBibleApiData";
import {
  PLAYLIST_PAGE_PANE_ID,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { PlaylistSchema } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { I18nProvider } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";
const PAGE_PATH = "/en/playlist/owner.playlist_shared/exodus-stories";

const PLAYLIST = PlaylistSchema.parse({
  id: "playlist_shared",
  recordName: "owner",
  authorUserId: "author-1",
  title: "Exodus Stories",
  description: null,
  items: [
    {
      type: "bible-verse",
      translationId: "AAB",
      ref: { bookId: "EXO", chapter: 2 },
    },
  ],
  createdAtMs: 1,
  updatedAtMs: 1,
});

describe("a playlist's page: Share, and its owner's Edit and Delete", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
    localStorage.removeItem("sessionKey");
  });

  async function openPage(userId: string | null) {
    window.history.replaceState(null, "", PAGE_PATH);
    const state = await createTestSeedBibleState({
      responses: {
        [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
          createResponse(translations),
        [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
          createResponse(aabBooks),
        [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
          makeChapter(aabBooks, "GEN", 1)
        ),
        [makeUrl("/api/AAB/EXO/2.json", PRIVATE_API_ENDPOINT)]: createResponse(
          makeChapter(aabBooks, "EXO", 2)
        ),
        // What signing in asks the records server: nothing found.
        "https://auth.seedbible.org/api/v3/callProcedure": createResponse({
          success: true,
          data: null,
          items: [],
          totalCount: 0,
        }),
      },
      todayOpen: "fromUrl",
      initialPlaylistPageSeed: {
        locator: "owner.playlist_shared",
        item: PLAYLIST,
        authorName: "Ruth",
      },
    });
    if (userId) {
      await act(async () => {
        state.os.sessionKey.value = formatV1SessionKey(
          userId,
          "session-1",
          "secret-1",
          Date.now() + 1000 * 60 * 60
        );
      });
      await waitFor(() => state.login.userId.value === userId, 2000);
    }
    await waitFor(() => pageOpen(state), 2000);
    draw(state);
    return state;
  }

  const pageOpen = (state: SeedBibleState) =>
    state.panes.panes.value.some((pane) => pane.id === PLAYLIST_PAGE_PANE_ID);

  function draw(state: SeedBibleState) {
    const pane = state.panes.panes.value.find(
      (p) => p.id === PLAYLIST_PAGE_PANE_ID
    );
    act(() => {
      render(
        <I18nProvider i18n={state.i18n}>
          {pane?.component() ?? null}
          <ModalHost manager={state.modals} />
        </I18nProvider>,
        container
      );
    });
  }

  const header = () => container.querySelector(".sb-playlist-page-header")!;
  const menuButton = () =>
    header().querySelector<HTMLButtonElement>(
      '[aria-label="Playlist options"]'
    );
  const menuItem = (label: string) =>
    Array.from(
      document.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    ).find((item) => item.textContent?.includes(label))!;

  it("opens the share sheet from Share, for anyone", async () => {
    const state = await openPage(null);

    act(() =>
      header().querySelector<HTMLButtonElement>('[aria-label="Share"]')!.click()
    );
    expect(
      state.modals.modals.value.some(
        (modal) =>
          typeof modal.title === "object" &&
          modal.title.key === "share-sheet-title"
      )
    ).toBe(true);
  });

  it("has no Edit or Delete for someone else's playlist", async () => {
    await openPage("someone-else");

    expect(menuButton()).toBeNull();
  });

  it("lets its owner edit it, leaving the page for the editor", async () => {
    const state = await openPage("author-1");

    act(() => menuButton()!.click());
    act(() => menuItem("Edit").click());

    expect(state.playlists.editingPlaylist.value?.id).toBe("playlist_shared");
    await waitFor(() => !pageOpen(state), 2000);
    expect(new URL(window.location.href).pathname).not.toBe(PAGE_PATH);
  });

  it("lets its owner delete it once confirmed, leaving the page", async () => {
    const state = await openPage("author-1");
    const deletePlaylist = vi
      .spyOn(state.playlists, "deletePlaylist")
      .mockResolvedValue();

    act(() => menuButton()!.click());
    act(() => menuItem("Delete").click());
    draw(state);
    expect(deletePlaylist).not.toHaveBeenCalled();
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          ".sb-confirm-delete .sb-delete-button"
        )!
        .click();
    });

    expect(deletePlaylist).toHaveBeenCalledWith(
      expect.objectContaining({ id: "playlist_shared" })
    );
    await waitFor(() => !pageOpen(state), 2000);
  });
});
