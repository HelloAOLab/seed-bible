import { render } from "preact";
import { act } from "preact/test-utils";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import { QuickToolbar } from "@packages/seed-bible/seed-bible/components/QuickToolbar/QuickToolbar";
import { ShareModal } from "@packages/seed-bible/seed-bible/components/ShareModal/shareModal";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const MOBILE_VIEWPORT_WIDTH = 400;
const DESKTOP_VIEWPORT_WIDTH = 1280;

/**
 * Covers the Share move at the call sites: the tool is visible only when
 * QuickToolbar actually forwards modals/app, and it is kept off the main
 * reader toolbar on both mobile and desktop.
 */
describe("share button — surface wiring", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let originalInnerWidth: number;

  async function setupState(viewportWidth: number) {
    window.innerWidth = viewportWidth;
    window.innerHeight = 800;

    state = await createTestSeedBibleState();

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
  }

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
  });

  async function renderQuickToolbar() {
    const readingState = state.app.currentReadingState.value!.tab.readingState;
    await act(async () => {
      render(
        <TestHost state={state}>
          <QuickToolbar
            toolsManager={state.tools}
            readingState={readingState}
            playlists={state.playlists}
            annotations={state.annotations}
            features={state.features}
            sharedSession={null}
            toast={state.app.toast}
            modals={state.modals}
            app={state.app}
          />
        </TestHost>,
        container
      );
    });
  }

  async function renderReaderToolbar() {
    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });
  }

  it("puts Share in the quick toolbar on mobile", async () => {
    await setupState(MOBILE_VIEWPORT_WIDTH);
    expect(state.app.isMobile.value).toBe(true);

    await renderQuickToolbar();

    expect(container.querySelector('[aria-label="Share"]')).not.toBeNull();
  });

  it("puts Share in the quick toolbar on desktop", async () => {
    await setupState(DESKTOP_VIEWPORT_WIDTH);
    expect(state.app.isMobile.value).toBe(false);

    await renderQuickToolbar();

    expect(container.querySelector('[aria-label="Share"]')).not.toBeNull();
  });

  it("keeps Share off the labeled desktop toolbar", async () => {
    await setupState(DESKTOP_VIEWPORT_WIDTH);

    await renderReaderToolbar();

    const shareButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Share"
    );
    expect(shareButton).toBeUndefined();
  });

  it("hides Share from the quick toolbar in an embed", async () => {
    window.innerWidth = DESKTOP_VIEWPORT_WIDTH;
    state = await createTestSeedBibleState({ embed: true });
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    await renderQuickToolbar();

    expect(container.querySelector('[aria-label="Share"]')).toBeNull();
  });

  async function renderShareSheet(embedded: boolean) {
    state = await createTestSeedBibleState({ embed: embedded });
    await act(async () => {
      render(
        <TestHost state={state}>
          <ShareModal
            app={state.app}
            session={null}
            onShareLink={() => undefined}
          />
        </TestHost>,
        container
      );
    });
  }

  it("offers a shared session from the share sheet", async () => {
    await renderShareSheet(false);

    expect(container.textContent).toContain("Share a link");
    expect(container.textContent).toContain("Start and share session");
  });

  it("drops shared session options from the share sheet in an embed", async () => {
    await renderShareSheet(true);

    expect(container.textContent).toContain("Share a link");
    expect(container.textContent).not.toContain("Start and share session");
    expect(container.textContent).not.toContain("Share current session");
  });
});
