import { render } from "preact";
import { act } from "preact/test-utils";
import { OfflineRecoveryToast } from "@packages/seed-bible/seed-bible/components/OfflineDownloadPrompt/OfflineRecoveryToast";
import {
  createBibleDataManager,
  type BibleDataManager,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createInMemoryTranslationStore } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  EXAMPLE_API_ENDPOINT,
  aabBooks,
  createResponse,
  createStreamingResponse,
  makeCompleteTranslation,
} from "../managers/testUtils/mockBibleApiData";
import { TestHost } from "./TestHost";

/**
 * The corner card suggesting a download after a failed chapter load came
 * back. Backed by a real offline manager — only the network and the storage
 * back end are fakes.
 */
describe("OfflineRecoveryToast", () => {
  const originalFetch = globalThis.fetch;
  const dataManagers: BibleDataManager[] = [];
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.clear();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    for (const manager of dataManagers.splice(0)) {
      manager.offline.dispose();
    }
    globalThis.fetch = originalFetch;
  });

  async function mount(options: { downloadFails?: boolean } = {}) {
    // First: it installs a network fake of its own, which would replace the
    // one below.
    const state = await createTestSeedBibleState();

    const url = (path: string) => new URL(path, EXAMPLE_API_ENDPOINT).href;
    globalThis.fetch = vi.fn((requested: string) => {
      if (requested === url("api/available_translations.json")) {
        return Promise.resolve(
          createResponse({ translations: [aabBooks.translation] })
        );
      }
      if (
        requested === url("api/AAB/complete.json") &&
        !options.downloadFails
      ) {
        return Promise.resolve(
          createStreamingResponse(makeCompleteTranslation(aabBooks, 2))
        );
      }
      return Promise.reject(new Error("Network request failed"));
    }) as unknown as typeof fetch;

    const dataManager = createBibleDataManager(
      new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
      { offlineStore: createInMemoryTranslationStore() }
    );
    dataManagers.push(dataManager);
    await dataManager.offline.ready;
    await dataManager.getTranslations();

    const toast = vi.fn();
    act(() => {
      render(
        <TestHost state={state}>
          <OfflineRecoveryToast offline={dataManager.offline} toast={toast} />
        </TestHost>,
        container
      );
    });
    return { offline: dataManager.offline, toast };
  }

  const card = () => container.querySelector(".sb-offline-recovery");
  const click = (selector: string) =>
    act(async () => {
      container.querySelector<HTMLButtonElement>(selector)?.click();
    });

  it("renders nothing until a suggestion is made", async () => {
    await mount();

    expect(card()).toBeNull();
  });

  it("names the translation it suggests saving", async () => {
    const { offline } = await mount();

    act(() => {
      offline.offerRecoveryPrompt(aabBooks.translation);
    });

    expect(
      container.querySelector(".sb-offline-recovery-title")?.textContent
    ).toBe(`Save ${aabBooks.translation.shortName} for offline reading?`);
    // Not a modal: the reader has just got their chapter back.
    expect(card()?.getAttribute("aria-modal")).toBe("false");
  });

  it("downloads the translation and closes when accepted", async () => {
    const { offline, toast } = await mount();
    act(() => {
      offline.offerRecoveryPrompt(aabBooks.translation);
    });

    await click(".sb-offline-recovery-btn-primary");

    expect(card()).toBeNull();
    await waitFor(() => offline.isDownloaded("AAB"));
    await waitFor(() => toast.mock.calls.length > 0);
    expect(toast).toHaveBeenCalledWith(
      `${aabBooks.translation.shortName} is now available offline`
    );
  });

  it("says so when the download fails", async () => {
    const { offline, toast } = await mount({ downloadFails: true });
    act(() => {
      offline.offerRecoveryPrompt(aabBooks.translation);
    });

    await click(".sb-offline-recovery-btn-primary");

    await waitFor(() => toast.mock.calls.length > 0);
    expect(toast).toHaveBeenCalledWith(
      `Couldn't download ${aabBooks.translation.shortName}.`
    );
    expect(offline.isDownloaded("AAB")).toBe(false);
  });

  it("closes without downloading when Escape is pressed", async () => {
    const { offline } = await mount();
    act(() => {
      offline.offerRecoveryPrompt(aabBooks.translation);
    });

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(card()).toBeNull();
    expect(offline.downloads.value.size).toBe(0);
  });

  it("closes without downloading when declined", async () => {
    const { offline, toast } = await mount();
    act(() => {
      offline.offerRecoveryPrompt(aabBooks.translation);
    });

    await click(".sb-offline-recovery-btn-secondary");

    expect(card()).toBeNull();
    expect(offline.downloads.value.size).toBe(0);
    expect(offline.isDownloaded("AAB")).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
});
