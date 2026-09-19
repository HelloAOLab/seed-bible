import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { MobileSettingsSheet } from "@packages/seed-bible/seed-bible/components/MobileSettingsSheet/MobileSettingsSheet";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { DEFAULT_VERSE_LINE_HEIGHT } from "@packages/seed-bible/seed-bible/managers/SettingsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function createSheetState(isMinimalEmbed: boolean): SeedBibleState {
  return {
    app: {
      isMinimalEmbed: signal(isMinimalEmbed),
    },
    settings: {
      settings: signal({
        fontSize: "M",
        uiSize: "M",
        keepScreenAwake: false,
        textConfig: {
          verse: { lineHeight: DEFAULT_VERSE_LINE_HEIGHT },
        },
      }),
      setFontSize: vi.fn(),
      setUISize: vi.fn(),
      setVerseLineHeight: vi.fn(),
      setKeepScreenAwake: vi.fn(),
    },
  } as unknown as SeedBibleState;
}

describe("MobileSettingsSheet — compact embed", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("hides Go to all settings when the page is a compact embed", () => {
    act(() => {
      render(
        <MobileSettingsSheet
          state={createSheetState(true)}
          onClose={() => {}}
          onOpenAllSettings={() => {}}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-mobile-settings-sheet-all-settings")
    ).toBeNull();
  });

  it("keeps Go to all settings on the phone reader", () => {
    act(() => {
      render(
        <MobileSettingsSheet
          state={createSheetState(false)}
          onClose={() => {}}
          onOpenAllSettings={() => {}}
        />,
        container
      );
    });

    const button = container.querySelector(
      ".sb-mobile-settings-sheet-all-settings"
    );
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain("Go to all settings");
  });
});
