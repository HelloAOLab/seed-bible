import { render } from "preact";
import { act } from "preact/test-utils";
import {
  PlaylistSchema,
  type Playlist,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

function makePlaylist(): Playlist {
  return PlaylistSchema.parse({
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: "Evening Reading",
    description: null,
    items: [{ type: "html", html: "<p>Think</p>" }],
    createdAtMs: 1,
    updatedAtMs: 1,
  });
}

/** My content, as the app renders it in its pane. */
function renderYourContent(state: SeedBibleState, container: HTMLElement) {
  const pane = state.panes.panes.value.find(
    (candidate) => candidate.id === "your-content-pane"
  );
  if (!pane) {
    throw new Error("My content isn't open");
  }
  act(() => {
    render(<TestHost state={state}>{pane.component()}</TestHost>, container);
  });
}

describe("leaving My content for a playlist", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  // Closing My content and opening the playlist's page are one move, so
  // Back from the page returns straight to My content.
  it("costs one history entry, so Back returns to My content", async () => {
    act(() => state.openYourContent());
    await waitFor(() =>
      state.panes.panes.value.some((pane) => pane.id === "your-content-pane")
    );
    act(() => {
      state.playlists.userPlaylists.value = [makePlaylist()];
    });
    renderYourContent(state, container);
    const contentUrl = window.location.href;
    const push = vi.spyOn(window.history, "pushState");

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-discover-item-play")!
        .click();
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe(
      "/en/playlist/user-1.playlist-1/evening-reading"
    );
    push.mockRestore();

    act(() => {
      state.playlists.backFromPlaylistPage();
    });
    await waitFor(() => window.location.href === contentUrl);
    expect(new URL(window.location.href).searchParams.get("content")).toBe(
      "open"
    );
  });
});
