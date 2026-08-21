import { render } from "preact";
import { act } from "preact/test-utils";
import initAudioReaderExtension from "@packages/audio-reader-extension/ext_audioReader/host/init";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import { QuickToolbar } from "@packages/seed-bible/seed-bible/components/QuickToolbar/QuickToolbar";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../managers/testUtils/mockBibleApiData";

const MOBILE_VIEWPORT_WIDTH = 400;
const DESKTOP_VIEWPORT_WIDTH = 1280;

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

const AUDIO_URL = "https://audio.example/GEN/1.mp3";

/** GEN 1, but with a reader track — `makeChapter` ships no audio by default. */
function chapterWithAudio() {
  return {
    ...makeChapter(aabBooks, "GEN", 1),
    thisChapterAudioLinks: { gilbert: AUDIO_URL },
  };
}

function createResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]:
      createResponse(chapterWithAudio()),
  };
}

/**
 * Covers #1607 at the call sites rather than at the predicate: the bug was a
 * surface string picked in a component, so a test that supplies `surface`
 * itself can't see it come back. Each toolbar is rendered for real and asked
 * whether the audio button is in the DOM.
 */
describe("audio-reader play button — surface wiring (#1607)", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  async function setupState(viewportWidth: number) {
    window.innerWidth = viewportWidth;
    window.innerHeight = 800;

    state = await createTestSeedBibleState({ responses: createResponses() });

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    // Runs the extension's real registration, so the `isVisible` wiring under
    // test is the one that ships rather than a copy rebuilt by the test.
    setupExtensionContext(state);
    await act(async () => {
      initAudioReaderExtension();
    });

    expect(
      state.tools.listQuickTools().some((t) => t.id === "ext_audioReader-play")
    ).toBe(true);
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    unregisterExtension("ext_audioReader");
    render(null, container);
    container.remove();
  });

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

  async function renderQuickToolbar() {
    const readingState = state.app.currentReadingState.value!.tab.readingState;
    await act(async () => {
      render(
        <TestHost state={state}>
          <QuickToolbar
            toolsManager={state.tools}
            readingState={readingState}
            playlists={state.playlists}
            features={state.features}
          />
        </TestHost>,
        container
      );
    });
  }

  it("puts the play button in the mobile floating nav pill", async () => {
    await setupState(MOBILE_VIEWPORT_WIDTH);
    expect(state.app.isMobile.value).toBe(true);

    await renderReaderToolbar();

    expect(
      container.querySelector(".sb-reader-floating-nav-play")
    ).not.toBeNull();
  });

  it("keeps the play button out of the quick toolbar on mobile", async () => {
    await setupState(MOBILE_VIEWPORT_WIDTH);

    await renderQuickToolbar();

    expect(container.querySelector('[aria-label="Listen"]')).toBeNull();
  });

  it("keeps the play button in the quick toolbar on desktop", async () => {
    await setupState(DESKTOP_VIEWPORT_WIDTH);
    expect(state.app.isMobile.value).toBe(false);

    await renderQuickToolbar();

    expect(container.querySelector('[aria-label="Listen"]')).not.toBeNull();
  });

  it("hides the play button everywhere when the chapter has no audio", async () => {
    await setupState(MOBILE_VIEWPORT_WIDTH);

    const readingState = state.app.currentReadingState.value!.tab.readingState;
    await act(async () => {
      readingState.chapterData.value = {
        ...readingState.chapterData.value!,
        thisChapterAudioLinks: {},
      };
    });

    await renderReaderToolbar();

    expect(container.querySelector(".sb-reader-floating-nav-play")).toBeNull();
  });
});
