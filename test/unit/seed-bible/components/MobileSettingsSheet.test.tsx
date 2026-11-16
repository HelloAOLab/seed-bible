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
        verseLineHeight: DEFAULT_VERSE_LINE_HEIGHT,
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
      document.querySelector(".sb-mobile-settings-sheet-all-settings")
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

    const button = document.querySelector(
      ".sb-mobile-settings-sheet-all-settings"
    );
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain("Go to all settings");
  });
});

describe("MobileSettingsSheet — sheet", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      render(null, container);
    });
    container.remove();
  });

  function renderSheet() {
    const onClose = vi.fn();
    act(() => {
      render(
        <MobileSettingsSheet
          state={createSheetState(false)}
          onClose={onClose}
          onOpenAllSettings={() => {}}
        />,
        container
      );
    });
    return onClose;
  }

  const sheet = () =>
    document.querySelector<HTMLElement>(".sb-mobile-settings-sheet");

  it("opens as a labelled dialog with its title and settings", () => {
    renderSheet();
    expect(sheet()!.getAttribute("role")).toBe("dialog");
    expect(sheet()!.getAttribute("aria-label")).toBe("Theme & text");
    expect(
      sheet()!.querySelector(".sb-bottom-sheet-title")?.textContent
    ).toContain("Theme & text");
    expect(sheet()!.textContent).toContain("Scripture settings");
    expect(sheet()!.textContent).toContain("Keep screen awake");
  });

  it("closes from the ✕ button", () => {
    const onClose = renderSheet();
    act(() => {
      sheet()!
        .querySelector<HTMLButtonElement>(".sb-bottom-sheet-close")!
        .click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = renderSheet();
    act(() => {
      sheet()!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when dragged down by its handle", () => {
    const onClose = renderSheet();
    const handle = sheet()!.querySelector<HTMLElement>(
      ".sb-bottom-sheet-handle-area"
    )!;
    act(() => {
      for (const [type, clientY] of [
        ["pointerdown", 400],
        ["pointermove", 500],
        ["pointerup", 500],
      ] as const) {
        handle.dispatchEvent(
          new window.PointerEvent(type, {
            pointerId: 1,
            clientY,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps settings changes from closing it", () => {
    const onClose = renderSheet();
    act(() => {
      sheet()!
        .querySelector<HTMLButtonElement>(
          ".sb-mobile-settings-sheet-size-button"
        )!
        .click();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
