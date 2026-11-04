import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistRow } from "@packages/seed-bible/seed-bible/components/DiscoverPane/PlaylistRow";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import { ToastHost } from "@packages/seed-bible/seed-bible/components/ToastHost/ToastHost";
import type { Playlist } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const PLAYLIST = {
  id: "p1",
  recordName: "rec",
  authorUserId: "user-1",
  title: "Morning devotions",
  description: null,
  items: [{ type: "text", text: "x" }],
  createdAtMs: 1761868800000,
  updatedAtMs: 1761868800000,
} as unknown as Playlist;

describe("sharing a playlist", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let writeText: ReturnType<typeof vi.fn>;
  let onPlay: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
    onPlay = vi.fn();
    act(() => {
      render(
        <TestHost state={state}>
          <>
            <ul>
              <PlaylistRow
                playlist={PLAYLIST}
                playlists={state.playlists}
                modals={state.modals}
                app={state.app}
                onPlay={onPlay}
              />
            </ul>
            <ModalHost manager={state.modals} />
            <ToastHost app={state.app} />
          </>
        </TestHost>,
        container
      );
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  const shareActions = () =>
    Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(".sb-share-action")
    );

  const action = (label: string) =>
    shareActions().find((button) => button.textContent?.includes(label));

  async function openShareSheet() {
    await act(async () => {
      container.querySelector<HTMLElement>(".sb-discover-item-menu")!.click();
    });
    // The menu renders in a portal, outside the container.
    const share = Array.from(
      document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    ).find((item) => item.textContent?.includes("Share"));
    await act(async () => {
      share!.click();
    });
  }

  it("opens the share sheet instead of copying the link right away", async () => {
    await openShareSheet();

    expect(writeText).not.toHaveBeenCalled();
    expect(action("Share a link")).toBeDefined();
    expect(action("Start and share session")).toBeDefined();
  });

  it("shows a QR code of the playlist link", async () => {
    await openShareSheet();
    await waitFor(() =>
      Boolean(container.querySelector(".sb-session-qr-code img"))
    );

    expect(container.querySelector(".sb-session-qr")?.textContent).toContain(
      "Opens this playlist on their phone."
    );
    expect(
      container.querySelector(".sb-session-qr-code img")?.getAttribute("alt")
    ).toBe("QR code to open this playlist");
  });

  it("copies the playlist link from Share a link and closes the sheet", async () => {
    await openShareSheet();

    await act(async () => {
      action("Share a link")!.click();
    });

    expect(writeText).toHaveBeenCalledWith(
      state.playlists.getPlaylistUrl(PLAYLIST)
    );
    await waitFor(() =>
      Boolean(
        container
          .querySelector(".sb-toast")
          ?.textContent?.includes("Playlist URL copied to clipboard")
      )
    );
    expect(shareActions()).toHaveLength(0);
  });

  it("says so when the link can't be copied", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValueOnce(new Error("denied"));
    await openShareSheet();

    await act(async () => {
      action("Share a link")!.click();
    });

    await waitFor(() =>
      Boolean(
        container
          .querySelector(".sb-toast")
          ?.textContent?.includes("Couldn't copy the playlist link")
      )
    );
  });

  it("starts a session that plays the playlist and copies its invite link", async () => {
    const session = { id: "playlist-session" } as BibleReadingSession;
    vi.spyOn(state.app, "createSharedSession").mockResolvedValue(session);
    await openShareSheet();

    await act(async () => {
      action("Start and share session")!.click();
    });

    await waitFor(() => writeText.mock.calls.length > 0);
    expect(onPlay).toHaveBeenCalledWith(PLAYLIST);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("sessionId=playlist-session")
    );
  });

  it("doesn't play the playlist when the session can't be started", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(state.app, "createSharedSession").mockRejectedValue(
      new Error("offline")
    );
    await openShareSheet();

    await act(async () => {
      action("Start and share session")!.click();
    });

    await waitFor(() => shareActions().length === 0);
    expect(onPlay).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });
});
