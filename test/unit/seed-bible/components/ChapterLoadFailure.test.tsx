import { render } from "preact";
import { act } from "preact/test-utils";
import { BibleReader } from "@packages/seed-bible/seed-bible/components/BibleReader/BibleReader";
import { createInMemoryTranslationStore } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { TabSlot } from "@packages/seed-bible/seed-bible/managers/TabsLayoutManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createDefaultSelectorManagerResponseMap,
  createStreamingResponse,
  makeCompleteTranslation,
  makeUrl,
} from "../managers/testUtils/mockBibleApiData";
import { TestHost } from "./TestHost";

/**
 * The chapter-load failure screen, reached through a real failed load rather
 * than a hand-set error: a real reading state, offline manager and selector,
 * with only the network and the storage back end faked.
 */
describe("the chapter-load failure screen after a failed translation switch", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // The fake responses are keyed to the free-use API, which the app only
    // talks to when the page asks for it.
    jsdom.reconfigure({ url: "https://seedbible.org/?useFreeBibleAPI" });
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      render(null, container);
    });
    container.remove();
    window.dispatchEvent(new Event("online"));
  });

  /**
   * Reading AAB, which is saved on the device, with NIV's book list
   * unreachable — the state a switch to NIV meets while offline.
   */
  async function readAabWithNivUnreachable() {
    const responses = createDefaultSelectorManagerResponseMap();
    const nivBooksUrl = makeUrl("/api/NIV/books.json");
    const nivBooksResponse = responses[nivBooksUrl]!;
    delete responses[nivBooksUrl];
    responses[makeUrl("/api/AAB/complete.json")] = createStreamingResponse(
      makeCompleteTranslation(aabBooks, 2)
    );

    const state = await createTestSeedBibleState({
      responses,
      offlineStore: createInMemoryTranslationStore(),
    });
    const slot = state.tabsLayout.slots.value[0] as TabSlot;
    const readingState = slot.tab!.readingState;
    expect(readingState.translationId.value).toBe("AAB");
    expect(await state.bibleData.offline.downloadTranslation("AAB")).toBe(true);
    // The translation list the user picks NIV from, loaded while still online.
    // Opening AAB straight from the URL never needed it.
    await state.bibleData.getTranslations();

    act(() => {
      render(
        <TestHost state={state}>
          <BibleReader
            currentSlot={slot}
            selectorState={state.selector}
            readingState={readingState}
            state={state}
          />
        </TestHost>,
        container
      );
    });

    const reconnect = () => {
      responses[nivBooksUrl] = nivBooksResponse;
      window.dispatchEvent(new Event("online"));
    };
    return { state, readingState, reconnect };
  }

  async function switchToNivOffline(readingState: BibleReadingState) {
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await act(async () => {
      await readingState.selectTranslation("NIV");
    });
    expect(container.querySelector(".sb-reader-error")).not.toBeNull();
  }

  const errorText = () =>
    container.querySelector(".sb-reader-error")?.textContent ?? "";

  it("names the translation that failed, not the one still on screen", async () => {
    const { readingState } = await readAabWithNivUnreachable();

    await switchToNivOffline(readingState);

    // The switch never moved the position, so the reader is still "in" AAB —
    // which is saved, and would have had no hint at all.
    expect(readingState.translationId.value).toBe("AAB");
    expect(errorText()).toContain(
      "Once you're back online, download NIV so this doesn't happen again."
    );
  });

  it("offers the translation the reader was already in as a way out", async () => {
    const { readingState } = await readAabWithNivUnreachable();

    await switchToNivOffline(readingState);

    expect(errorText()).toContain("Choose a saved translation");
  });

  it("suggests saving the translation once a reload finishes the switch", async () => {
    const { state, readingState, reconnect } =
      await readAabWithNivUnreachable();
    await switchToNivOffline(readingState);

    act(() => {
      reconnect();
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-reader-error-retry")
        ?.click();
    });
    await waitFor(() => readingState.translationId.value === "NIV");

    await waitFor(() => state.bibleData.offline.recoveryPrompt.value !== null);
    expect(state.bibleData.offline.recoveryPrompt.value?.id).toBe("NIV");
  });
});
