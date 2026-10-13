import { render } from "preact";
import { act } from "preact/test-utils";
import { DockableThemeLivePreview } from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationPreviews";
import { LIGHT_THEME } from "@packages/seed-bible/seed-bible/managers/ThemeManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe("DockableThemeLivePreview", () => {
  let container: HTMLDivElement;
  let observerCallback: ObserverCallback | null;

  beforeEach(() => {
    observerCallback = null;
    // jsdom has no layout, so the browser's scroll-visibility reports are
    // driven by hand.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: ObserverCallback) {
          observerCallback = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderInSidePane(options: { canFloat: boolean; paneLeft: number }) {
    const pane = document.createElement("div");
    pane.className = "sb-pane-side-shell";
    pane.getBoundingClientRect = () =>
      ({ left: options.paneLeft, top: 0 }) as DOMRect;
    const body = document.createElement("div");
    body.className = "sb-pane-detached-body";
    body.getBoundingClientRect = () => ({ left: 0, top: 48 }) as DOMRect;
    pane.appendChild(body);
    container.appendChild(pane);
    act(() => {
      render(
        <DockableThemeLivePreview
          theme={LIGHT_THEME}
          canFloat={options.canFloat}
        />,
        body
      );
    });
  }

  function reportScroll(scrolledPast: boolean) {
    act(() => {
      observerCallback?.([
        {
          isIntersecting: !scrolledPast,
          boundingClientRect: {
            bottom: scrolledPast ? 10 : 300,
          } as DOMRectReadOnly,
          rootBounds: { top: 48 } as DOMRectReadOnly,
        },
      ]);
    });
  }

  const floatingPreview = () =>
    document.querySelector<HTMLElement>(
      "[data-testid='floating-theme-preview']"
    );

  it("pops the preview out beside the pane once it scrolls out of view, and docks it again on scrolling back", () => {
    renderInSidePane({ canFloat: true, paneLeft: 900 });
    expect(floatingPreview()).toBeNull();

    reportScroll(true);
    const floating = floatingPreview();
    expect(floating).not.toBeNull();
    expect(floating!.style.right).toBe(`${window.innerWidth - 900 + 16}px`);
    expect(floating!.style.top).toBe("64px");
    expect(floating!.querySelector(".sb-cz-live-preview")).not.toBeNull();

    reportScroll(false);
    expect(floatingPreview()).toBeNull();
  });

  it("stays docked on mobile", () => {
    renderInSidePane({ canFloat: false, paneLeft: 900 });
    reportScroll(true);
    expect(floatingPreview()).toBeNull();
  });

  it("stays docked when there isn't room beside the pane", () => {
    renderInSidePane({ canFloat: true, paneLeft: 200 });
    reportScroll(true);
    expect(floatingPreview()).toBeNull();
  });

  it("can be hidden, and comes back after the preview is scrolled to again", () => {
    renderInSidePane({ canFloat: true, paneLeft: 900 });
    reportScroll(true);
    act(() => {
      floatingPreview()!
        .querySelector<HTMLButtonElement>(".sb-cz-floating-preview-close")!
        .click();
    });
    expect(floatingPreview()).toBeNull();

    reportScroll(false);
    reportScroll(true);
    expect(floatingPreview()).not.toBeNull();
  });
});
