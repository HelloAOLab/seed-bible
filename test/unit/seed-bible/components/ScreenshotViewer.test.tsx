import { render } from "preact";
import { act } from "preact/test-utils";
import { useSignal } from "@preact/signals";
import { BottomSheet } from "@packages/seed-bible/seed-bible/components/BottomSheet/BottomSheet";
import {
  ScreenshotViewer,
  type Screenshot,
} from "@packages/seed-bible/seed-bible/components/ScreenshotViewer/ScreenshotViewer";
import {
  createI18nManager,
  I18nProvider,
  type I18nManager,
} from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";

const shots: Screenshot[] = [
  { src: "/portrait.png", caption: "A map", accessibleName: "A map" },
  { src: "/landscape.png", accessibleName: "Screenshot 2" },
  { src: "/third.png", caption: "A timeline", accessibleName: "A timeline" },
];

describe("ScreenshotViewer", () => {
  let root: HTMLDivElement;
  let opener: HTMLButtonElement;
  let i18n: I18nManager;

  beforeEach(async () => {
    root = document.createElement("div");
    opener = document.createElement("button");
    document.body.append(root, opener);
    opener.focus();
    i18n = createI18nManager(createNavigationManager(), ["en"]);
    await i18n.ready;
  });

  afterEach(() => {
    act(() => render(null, root));
    root.remove();
    opener.remove();
    i18n.dispose();
  });

  function show(initialIndex = 0, screenshots = shots, className?: string) {
    act(() => {
      render(
        <I18nProvider i18n={i18n}>
          <ScreenshotViewer
            screenshots={screenshots}
            initialIndex={initialIndex}
            className={className}
            onClose={() => render(null, root)}
          />
        </I18nProvider>,
        root
      );
    });
  }

  const dialog = () =>
    document.querySelector<HTMLDivElement>('[role="dialog"]')!;
  const image = () => dialog().querySelector("img")!;
  const button = (name: string) =>
    dialog().querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const key = (key: string, shiftKey = false) => {
    const event = new KeyboardEvent("keydown", {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.activeElement!.dispatchEvent(event);
    });
    return event;
  };
  const click = (element: HTMLElement) => act(() => element.click());
  function swipe(dx: number, dy = 0, cancel = false) {
    const target = image();
    act(() => {
      for (const [type, x, y] of [
        ["pointerdown", 100, 100],
        [cancel ? "pointercancel" : "pointerup", 100 + dx, 100 + dy],
      ] as const) {
        const event = new Event(type, { bubbles: true });
        Object.assign(event, {
          pointerId: 1,
          clientX: x,
          clientY: y,
          button: 0,
          isPrimary: true,
        });
        target.dispatchEvent(event);
      }
    });
  }

  it("portals an accessible dialog with the selected image, caption, counter and placement class", () => {
    show(2, shots, "placed");
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(dialog().getAttribute("aria-modal")).toBe("true");
    expect(dialog().getAttribute("aria-label")).toBe("Screenshots");
    expect(dialog().classList.contains("placed")).toBe(true);
    expect(image().getAttribute("src")).toBe("/third.png");
    expect(image().alt).toBe("A timeline");
    expect(dialog().textContent).toContain("3 of 3");
    expect(dialog().textContent).toContain("A timeline");
  });

  it("steps with buttons, disables the ends and does not wrap with arrow keys", () => {
    show();
    expect(button("Previous screenshot").disabled).toBe(true);
    key("ArrowLeft");
    expect(dialog().textContent).toContain("1 of 3");
    click(button("Next screenshot"));
    expect(image().alt).toBe("Screenshot 2");
    expect(dialog().textContent).not.toContain("A map");
    expect(button("Previous screenshot").disabled).toBe(false);
    key("ArrowRight");
    expect(dialog().textContent).toContain("3 of 3");
    expect(button("Next screenshot").disabled).toBe(true);
    key("ArrowRight");
    expect(dialog().textContent).toContain("3 of 3");
    click(button("Previous screenshot"));
    expect(dialog().textContent).toContain("2 of 3");
  });

  it("keeps focus in the viewer when navigation reaches either end", () => {
    show();
    const next = button("Next screenshot");
    next.focus();
    click(next);
    click(next);
    expect(document.activeElement).toBe(button("Close screenshot viewer"));
    button("Previous screenshot").focus();
    click(button("Previous screenshot"));
    click(button("Previous screenshot"));
    expect(document.activeElement).toBe(button("Close screenshot viewer"));
    key("Escape");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("leaves the settings sheet open when Escape follows navigation to the end", () => {
    const closeSheet = vi.fn();
    function Settings() {
      const viewerOpen = useSignal(true);
      return (
        <BottomSheet label="Settings" onClose={closeSheet}>
          {viewerOpen.value && (
            <ScreenshotViewer
              screenshots={shots}
              onClose={() => (viewerOpen.value = false)}
            />
          )}
        </BottomSheet>
      );
    }
    act(() =>
      render(
        <I18nProvider i18n={i18n}>
          <Settings />
        </I18nProvider>,
        root
      )
    );
    const viewer = document.querySelector<HTMLElement>(
      '[aria-label="Screenshots"]'
    )!;
    const next = viewer.querySelector<HTMLButtonElement>(
      'button[aria-label="Next screenshot"]'
    )!;
    next.focus();
    click(next);
    click(next);
    expect(viewer.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(
      viewer.querySelector('button[aria-label="Close screenshot viewer"]')
    );
    key("Escape");
    expect(document.querySelector('[aria-label="Screenshots"]')).toBeNull();
    expect(document.querySelector('[aria-label="Settings"]')).not.toBeNull();
    expect(closeSheet).not.toHaveBeenCalled();
  });

  it("shows the next neighbour when the open image disappears", () => {
    show(1);
    show(1, [shots[0]!, shots[2]!]);
    expect(image().getAttribute("src")).toBe("/third.png");
    expect(dialog().textContent).toContain("2 of 2");
  });

  it("navigates through repeated image sources", () => {
    show(0, [shots[0]!, shots[0]!, shots[2]!]);
    click(button("Next screenshot"));
    click(button("Next screenshot"));
    expect(image().getAttribute("src")).toBe("/third.png");
  });

  it("opens on the second image, moves with arrows, closes with Escape and restores focus", () => {
    show(1);
    expect(dialog().contains(document.activeElement)).toBe(true);
    key("ArrowRight");
    expect(dialog().textContent).toContain("3 of 3");
    key("Escape");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("traps Tab and Shift+Tab and redirects focus attempts from outside", () => {
    show(1);
    expect(document.activeElement).toBe(button("Close screenshot viewer"));
    expect(key("Tab", true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button("Next screenshot"));
    expect(key("Tab").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button("Close screenshot viewer"));
    opener.focus();
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it.each(["close button", "backdrop"])(
    "closes with %s and restores focus",
    (method) => {
      show();
      if (method === "close button") click(button("Close screenshot viewer"));
      else
        act(() => {
          dialog().dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true })
          );
          dialog().click();
        });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(opener);
    }
  );

  it("keeps image clicks and drags ending on the backdrop open", () => {
    show();
    act(() => {
      image().dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      image().click();
      dialog().click();
    });
    expect(dialog()).not.toBeNull();
  });

  it("hides navigation for one image and traps focus on the close control", () => {
    show(0, [shots[0]!]);
    expect(dialog().querySelectorAll("button")).toHaveLength(1);
    expect(dialog().textContent).toContain("1 of 1");
    key("ArrowRight");
    key("Tab");
    expect(document.activeElement).toBe(button("Close screenshot viewer"));
  });

  it("requires a horizontal swipe over 40px and ignores vertical or cancelled gestures", () => {
    show();
    swipe(-40);
    swipe(-60, 80);
    swipe(-80, 0, true);
    expect(dialog().textContent).toContain("1 of 3");
    swipe(-41);
    expect(dialog().textContent).toContain("2 of 3");
    swipe(41);
    expect(dialog().textContent).toContain("1 of 3");
    swipe(80);
    expect(dialog().textContent).toContain("1 of 3");
  });

  it("mirrors arrow keys, swipe directions and button icons in RTL", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    show(1);
    expect(dialog().dir).toBe("rtl");
    expect(button("Next screenshot").textContent).toContain("chevron_left");
    key("ArrowLeft");
    expect(dialog().textContent).toContain("3 of 3");
    key("ArrowLeft");
    expect(dialog().textContent).toContain("3 of 3");
    key("ArrowRight");
    expect(dialog().textContent).toContain("2 of 3");
    swipe(60);
    expect(dialog().textContent).toContain("3 of 3");
    swipe(-60);
    expect(dialog().textContent).toContain("2 of 3");
  });
});
