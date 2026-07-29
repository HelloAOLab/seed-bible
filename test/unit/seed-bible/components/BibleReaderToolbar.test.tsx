import { render } from "preact";
import { act } from "preact/test-utils";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

/** The width `app.isMobile` needs to see for the bottom tab bar to render. */
const MOBILE_VIEWPORT_WIDTH = 400;

describe("BibleReaderToolbar mobile More menu", () => {
  let container: HTMLDivElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    // `viewportWidth` is seeded from `window.innerWidth` when the state is
    // created, so this has to be set before `createTestSeedBibleState`.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
  });

  async function renderToolbar(): Promise<{
    state: SeedBibleState;
    moreButton: HTMLButtonElement;
  }> {
    const state = await createTestSeedBibleState();

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const moreButton = container.querySelector<HTMLButtonElement>(
      ".sb-reader-toolbar-more-anchor button"
    );
    if (!moreButton) {
      throw new Error("The mobile More button did not render.");
    }
    return { state, moreButton };
  }

  const menu = () => container.querySelector(".sb-mobile-more-menu");

  async function openMenu(moreButton: HTMLButtonElement): Promise<void> {
    await act(async () => {
      moreButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu()).not.toBeNull();
  }

  it("closes when a tap lands outside the menu", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    await act(async () => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
    });

    expect(menu()).toBeNull();
  });

  it("stays open while the tap is inside the menu", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    const item = container.querySelector(".sb-mobile-more-menu-item");
    expect(item).not.toBeNull();

    await act(async () => {
      item!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    // Menu items close the menu through their own click handler, not through the
    // outside-tap listener — so the pointerdown alone must leave it open.
    expect(menu()).not.toBeNull();
  });

  it("lets the dismissing tap through to whatever it landed on", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    // Stands in for a verse or a top quick-toolbar button: the tap that closes
    // the menu must still reach its target and do its job.
    const outside = document.createElement("button");
    const onClick = vi.fn();
    outside.addEventListener("click", onClick);
    document.body.appendChild(outside);

    await act(async () => {
      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(menu()).toBeNull();
    expect(onClick).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it("closes on Escape and returns focus to the More button", async () => {
    const { moreButton } = await renderToolbar();
    moreButton.focus();
    await openMenu(moreButton);

    // A keyboard user tabs into the menu before deciding to back out, so focus
    // is inside the popover — which is about to be removed from the document.
    const item = container.querySelector<HTMLButtonElement>(
      ".sb-mobile-more-menu-item"
    );
    item!.focus();
    expect(document.activeElement).toBe(item);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(menu()).toBeNull();
    // Without this, focus is left on the removed popover and the next Tab press
    // restarts from the top of the document.
    expect(document.activeElement).toBe(moreButton);
  });

  it("stops listening once the menu is closed", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    // Close it the ordinary way, by tapping the button again.
    await act(async () => {
      moreButton.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      moreButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu()).toBeNull();

    // A later Escape must not be picked up by a listener that should have been
    // torn down — and must not reopen or otherwise disturb anything.
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(menu()).toBeNull();
  });
});
