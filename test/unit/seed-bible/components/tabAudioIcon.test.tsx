import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type { AudioPlaybackController } from "@packages/seed-bible/seed-bible/managers/AudioPlaybackManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

function createPlayback(playing: boolean) {
  const isPlaying = signal(playing);
  const playback: AudioPlaybackController = {
    unit: "seconds",
    isPlaying,
    currentTime: signal(0),
    duration: signal<number | null>(60),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    stop: vi.fn(),
  };
  return { playback, isPlaying };
}

describe("sidebar tabs — playing audio", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.clear();
    state = await createTestSeedBibleState();
    state.settings.setDisablePanels(false);
    while (visibleTabs().length < 2) state.tabs.addTab();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function renderSidebar(collapsed: boolean) {
    state.sidebar.isSidebarCollapsed.value = collapsed;
    state.sidebar.isMobileOpen.value = false;
    await act(() => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });
  }

  /** The tabs the sidebar lists, in its order. */
  const visibleTabs = () =>
    state.tabs.tabs.value.filter((tab) => !tab.slotOnly);
  const firstTab = () => visibleTabs()[0]!;
  const secondTab = () => visibleTabs()[1]!;

  it("marks the tab whose audio is playing, and only that one", async () => {
    const { playback, isPlaying } = createPlayback(true);
    state.audioPlayback.show(secondTab().readingState, playback);
    await renderSidebar(false);

    // Tab rows only — the list also ends with an "add a tab" row.
    const rows = [...container.querySelectorAll(".sb-tab-row")].filter((row) =>
      row.querySelector(".sb-tab-main-title")
    );
    expect(rows).toHaveLength(visibleTabs().length);
    expect(container.querySelectorAll(".sb-tab-audio-icon")).toHaveLength(1);
    const icon = rows[1]!.querySelector(".sb-tab-audio-icon");
    expect(icon?.textContent).toBe("volume_up");
    expect(icon?.getAttribute("aria-label")).toBe("Playing audio");

    // Paused audio keeps its place, but nothing is playing to mark.
    await act(() => {
      isPlaying.value = false;
    });
    expect(container.querySelector(".sb-tab-audio-icon")).toBeNull();
  });

  it("marks the playing tab in the collapsed sidebar too", async () => {
    const { playback } = createPlayback(true);
    state.audioPlayback.show(firstTab().readingState, playback);
    await renderSidebar(true);

    const tiles = [...container.querySelectorAll(".sb-collapsed-tab-tile")];
    expect(tiles).toHaveLength(visibleTabs().length);
    expect(
      container.querySelectorAll(".sb-collapsed-tab-audio-icon")
    ).toHaveLength(1);
    expect(
      tiles[0]!.querySelector(".sb-collapsed-tab-audio-icon")?.textContent
    ).toBe("volume_up");
    expect(tiles[0]!.getAttribute("aria-label")).toMatch(/playing audio$/);
  });
});
