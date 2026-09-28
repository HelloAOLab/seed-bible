import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { OfflineDownloadPrompt } from "@packages/seed-bible/seed-bible/components/OfflineDownloadPrompt/OfflineDownloadPrompt";
import {
  estimateTranslationSizeBytes,
  formatBytes,
  type OfflineTranslationsManager,
} from "@packages/seed-bible/seed-bible/managers/OfflineTranslationsManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { aabBooks } from "../managers/testUtils/mockBibleApiData";
import { TestHost } from "./TestHost";

const BSB: Translation = {
  ...aabBooks.translation,
  id: "BSB",
  name: "Berean Standard Bible",
  shortName: "BSB",
};

interface OfflineStub {
  offline: OfflineTranslationsManager;
  downloadTranslation: ReturnType<typeof vi.fn>;
  dismissDownloadPrompt: ReturnType<typeof vi.fn>;
}

function createOffline(
  translation: Translation | null,
  options: { succeeds?: boolean; error?: string } = {}
): OfflineStub {
  const downloadPrompt = signal<Translation | null>(translation);
  const errors = signal(
    new Map<string, string>(options.error ? [["BSB", options.error]] : [])
  );
  const downloadTranslation = vi
    .fn()
    .mockResolvedValue(options.succeeds ?? true);
  const dismissDownloadPrompt = vi.fn(() => {
    downloadPrompt.value = null;
  });

  return {
    offline: {
      downloadPrompt,
      errors,
      downloadTranslation,
      dismissDownloadPrompt,
    } as unknown as OfflineTranslationsManager,
    downloadTranslation,
    dismissDownloadPrompt,
  };
}

describe("OfflineDownloadPrompt", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function mount(stub: OfflineStub, toast = vi.fn()) {
    const state = await createTestSeedBibleState();
    act(() => {
      render(
        <TestHost state={state}>
          <OfflineDownloadPrompt offline={stub.offline} toast={toast} />
        </TestHost>,
        container
      );
    });
    return toast;
  }

  it("renders nothing when no translation is being offered", async () => {
    await mount(createOffline(null));

    expect(container.querySelector(".sb-offline-prompt")).toBeNull();
  });

  it("names the translation being offered and what it will cost", async () => {
    await mount(createOffline(BSB));

    expect(
      container.querySelector(".sb-offline-prompt-title")?.textContent
    ).toBe("Save BSB for offline reading?");

    const body = container.querySelector(
      ".sb-offline-prompt-body"
    )?.textContent;
    expect(body).toContain("Berean Standard Bible");
    // Derived rather than hardcoded: what matters is that the body quotes the
    // estimate, not what the bytes-per-verse calibration currently is.
    expect(body).toContain(
      formatBytes(estimateTranslationSizeBytes(BSB) as number)
    );
  });

  it("leaves out the size when the API reports no verse count", async () => {
    await mount(createOffline({ ...BSB, totalNumberOfVerses: 0 }));

    const body = container.querySelector(
      ".sb-offline-prompt-body"
    )?.textContent;
    expect(body).toContain("Berean Standard Bible");
    expect(body).not.toContain("About");
  });

  it("starts the download and closes when the offer is accepted", async () => {
    const stub = createOffline(BSB);
    const toast = await mount(stub);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-offline-prompt-btn-primary")
        ?.click();
    });

    expect(stub.downloadTranslation).toHaveBeenCalledWith("BSB");
    // Closes straight away rather than holding the user on a progress bar.
    expect(stub.dismissDownloadPrompt).toHaveBeenCalled();
    expect(container.querySelector(".sb-offline-prompt")).toBeNull();

    await waitFor(() => toast.mock.calls.length > 0);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("BSB"));
  });

  it("says so when the download fails", async () => {
    const stub = createOffline(BSB, {
      succeeds: false,
      error: "Network request failed",
    });
    const toast = await mount(stub);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-offline-prompt-btn-primary")
        ?.click();
    });

    await waitFor(() => toast.mock.calls.length > 0);
    expect(toast).toHaveBeenCalledWith("Couldn't download BSB.");
  });

  it("stays quiet when a download the user cancelled reports no error", async () => {
    const stub = createOffline(BSB, { succeeds: false });
    const toast = await mount(stub);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-offline-prompt-btn-primary")
        ?.click();
    });
    // Flush the handler's await before asserting nothing was said.
    await act(async () => {});

    expect(toast).not.toHaveBeenCalled();
  });

  it("closes without downloading when the offer is declined", async () => {
    const stub = createOffline(BSB);
    await mount(stub);

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-offline-prompt-btn-secondary")
        ?.click();
    });

    expect(stub.dismissDownloadPrompt).toHaveBeenCalled();
    expect(stub.downloadTranslation).not.toHaveBeenCalled();
    expect(container.querySelector(".sb-offline-prompt")).toBeNull();
  });

  it("closes without downloading when the backdrop is clicked", async () => {
    const stub = createOffline(BSB);
    await mount(stub);

    act(() => {
      container
        .querySelector<HTMLElement>(".sb-offline-prompt-overlay")
        ?.click();
    });

    expect(stub.dismissDownloadPrompt).toHaveBeenCalled();
    expect(stub.downloadTranslation).not.toHaveBeenCalled();
  });

  it("does not close when the card itself is clicked", async () => {
    const stub = createOffline(BSB);
    await mount(stub);

    act(() => {
      container.querySelector<HTMLElement>(".sb-offline-prompt")?.click();
    });

    expect(stub.dismissDownloadPrompt).not.toHaveBeenCalled();
    expect(container.querySelector(".sb-offline-prompt")).not.toBeNull();
  });

  it("closes without downloading when Escape is pressed", async () => {
    const stub = createOffline(BSB);
    await mount(stub);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(stub.dismissDownloadPrompt).toHaveBeenCalled();
    expect(stub.downloadTranslation).not.toHaveBeenCalled();
  });
});
