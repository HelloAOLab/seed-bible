import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { OfflineUpdatePrompt } from "@packages/seed-bible/seed-bible/components/OfflineDownloadPrompt/OfflineUpdatePrompt";
import type { OfflineTranslationsManager } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationsManager";
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
  dismissUpdatePrompt: ReturnType<typeof vi.fn>;
}

function createOffline(
  translation: Translation | null,
  options: { succeeds?: boolean; error?: string } = {}
): OfflineStub {
  const updatePrompt = signal<Translation | null>(translation);
  const errors = signal(
    new Map<string, string>(options.error ? [["BSB", options.error]] : [])
  );
  const downloadTranslation = vi
    .fn()
    .mockResolvedValue(options.succeeds ?? true);
  const dismissUpdatePrompt = vi.fn(() => {
    updatePrompt.value = null;
  });

  return {
    offline: {
      updatePrompt,
      errors,
      downloadTranslation,
      dismissUpdatePrompt,
    } as unknown as OfflineTranslationsManager,
    downloadTranslation,
    dismissUpdatePrompt,
  };
}

describe("OfflineUpdatePrompt", () => {
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
          <OfflineUpdatePrompt offline={stub.offline} toast={toast} />
        </TestHost>,
        container
      );
    });
    return toast;
  }

  it("renders nothing when no update is being offered", async () => {
    await mount(createOffline(null));

    expect(container.querySelector(".sb-offline-prompt")).toBeNull();
  });

  it("names the translation the update is offered for", async () => {
    await mount(createOffline(BSB));

    expect(
      container.querySelector(".sb-offline-prompt-title")?.textContent
    ).toBe("Update BSB?");

    const body = container.querySelector(
      ".sb-offline-prompt-body"
    )?.textContent;
    expect(body).toContain("Berean Standard Bible");
  });

  it("downloads the update and closes when accepted", async () => {
    const stub = createOffline(BSB);
    const toast = await mount(stub);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-offline-prompt-btn-primary")
        ?.click();
    });

    expect(stub.downloadTranslation).toHaveBeenCalledWith("BSB");
    // Closes straight away rather than holding the user on a progress bar.
    expect(stub.dismissUpdatePrompt).toHaveBeenCalled();
    expect(container.querySelector(".sb-offline-prompt")).toBeNull();

    await waitFor(() => toast.mock.calls.length > 0);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("BSB"));
  });

  it("says so when the update fails", async () => {
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
    expect(toast).toHaveBeenCalledWith("Couldn't update BSB.");
  });

  it("stays quiet when an update the user cancelled reports no error", async () => {
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

    expect(stub.dismissUpdatePrompt).toHaveBeenCalled();
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

    expect(stub.dismissUpdatePrompt).toHaveBeenCalled();
    expect(stub.downloadTranslation).not.toHaveBeenCalled();
  });

  it("does not close when the card itself is clicked", async () => {
    const stub = createOffline(BSB);
    await mount(stub);

    act(() => {
      container.querySelector<HTMLElement>(".sb-offline-prompt")?.click();
    });

    expect(stub.dismissUpdatePrompt).not.toHaveBeenCalled();
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

    expect(stub.dismissUpdatePrompt).toHaveBeenCalled();
    expect(stub.downloadTranslation).not.toHaveBeenCalled();
  });
});
