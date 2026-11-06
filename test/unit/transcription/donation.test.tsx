import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

/**
 * A fresh copy of the dialog, so each test downloads (or fails to download)
 * its translations anew, and a context whose `t` answers in `language` from
 * the same i18next instance the dialog adds its strings to.
 */
async function loadDonationDialog(language: string) {
  vi.resetModules();
  const { default: i18n } = await import("i18next");
  await i18n.init({ lng: "en", fallbackLng: "en", resources: {} });
  const { default: openDonationDialog } =
    await import("@packages/transcription/donation");
  const context = {
    i18n: { t: i18n.getFixedT(language) },
  } as unknown as SeedBibleState;
  return { openDonationDialog, context };
}

function dialogTitle() {
  return document.querySelector("#sbd-title")?.textContent ?? null;
}

describe("openDonationDialog", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    document.getElementById("donation-container")?.remove();
    vi.doUnmock("@packages/transcription/translations.json");
    errorSpy.mockRestore();
  });

  it("shows its strings in the reader's language", async () => {
    const { openDonationDialog, context } = await loadDonationDialog("es");

    await openDonationDialog({ onSuccess: () => {}, context });

    expect(dialogTitle()).toBe("Ayuda a mantener esta función en marcha");
  });

  it("opens in English when its translations can't be downloaded", async () => {
    vi.doMock("@packages/transcription/translations.json", () => {
      throw new Error("chunk failed to load");
    });
    const { openDonationDialog, context } = await loadDonationDialog("en");

    await openDonationDialog({ onSuccess: () => {}, context });

    expect(dialogTitle()).toBe("Help keep this feature running");
  });

  it("opens only once when asked twice at the same time", async () => {
    const { openDonationDialog, context } = await loadDonationDialog("en");

    await Promise.all([
      openDonationDialog({ onSuccess: () => {}, context }),
      openDonationDialog({ onSuccess: () => {}, context }),
    ]);

    expect(document.querySelectorAll("#donation-container")).toHaveLength(1);
  });
});
