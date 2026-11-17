import { render } from "preact";
import { act } from "preact/test-utils";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { createResponse } from "./testUtils/mockBibleApiData";
import {
  PLAYLIST_FINISHED_PANE_ID,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { PlaylistSchema } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { I18nProvider } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";

const PLAYLIST = PlaylistSchema.parse({
  id: "playlist_1",
  recordName: "owner",
  authorUserId: "author-1",
  title: "Psalms of Ascent",
  description: null,
  items: [
    { type: "html", html: "<p>One</p>" },
    { type: "html", html: "<p>Two</p>" },
  ],
  createdAtMs: 1,
  updatedAtMs: 1,
});

describe("the page a playlist ends on", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function finish() {
    const state = await createTestSeedBibleState({
      responses: {
        // Playing a saved playlist puts its page in the address bar, which
        // loads it from the records server.
        "https://auth.seedbible.org/api/v3/callProcedure": createResponse({
          success: true,
          data: PLAYLIST,
        }),
      },
    });
    state.playlists.startPlaying(PLAYLIST, 0, { history: false });
    const playing = state.playlists.playing.value!;
    await playing.next();
    await playing.next();
    return state;
  }

  const finishedPane = (state: SeedBibleState) =>
    state.panes.panes.value.find((p) => p.id === PLAYLIST_FINISHED_PANE_ID);

  function draw(state: SeedBibleState) {
    act(() => {
      render(
        <I18nProvider i18n={state.i18n}>
          {finishedPane(state)?.component() ?? null}
          <ModalHost manager={state.modals} />
        </I18nProvider>,
        container
      );
    });
  }

  const button = (label: string) =>
    Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes(label)
    )!;

  it("fills the screen once the last step is passed, with nothing popped up", async () => {
    const state = await finish();

    expect(finishedPane(state)?.placement).toBe("fullscreen");
    expect(state.modals.modals.value).toEqual([]);
    draw(state);
    expect(container.textContent).toContain(
      "You've reached the end of Psalms of Ascent."
    );
  });

  it("leaves the playlist from Done", async () => {
    const state = await finish();
    draw(state);

    act(() => button("Done").click());

    expect(state.playlists.playing.value).toBeNull();
    expect(finishedPane(state)).toBeUndefined();
  });

  it("opens the share sheet for the playlist from Share playlist", async () => {
    const state = await finish();
    draw(state);

    act(() => button("Share playlist").click());

    expect(
      state.modals.modals.value.some(
        (modal) =>
          typeof modal.title === "object" &&
          modal.title.key === "share-sheet-title"
      )
    ).toBe(true);
    expect(state.playlists.playing.value).not.toBeNull();
  });

  it("keeps playing when the page is put away some other way", async () => {
    const state = await finish();

    act(() => {
      state.panes.closePane(PLAYLIST_FINISHED_PANE_ID, "displaced");
    });

    expect(state.playlists.finishedPlaylist.value).toBeNull();
    expect(state.playlists.playing.value).not.toBeNull();
  });
});
