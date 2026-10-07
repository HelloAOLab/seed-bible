import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { ShareModal } from "@packages/seed-bible/seed-bible/components/ShareModal/shareModal";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import { QuickToolbar } from "@packages/seed-bible/seed-bible/components/QuickToolbar/QuickToolbar";
import { openShareModal } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const shareUrl = new URL("http://localhost:3000/en/BSB/genesis/1?verse=2");

describe("ShareModal embed", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function renderSheet(options?: {
    shareUrl?: URL;
    customizationLocator?: string | null;
  }) {
    const themes = signal([
      { id: "light", name: "Light" },
      { id: "dark", name: "Dark" },
    ]);
    const customizationLocator = signal(options?.customizationLocator ?? null);
    await act(async () => {
      render(
        <TestHost state={state}>
          <ShareModal
            app={state.app}
            modals={state.modals}
            session={null}
            shareUrl={options?.shareUrl}
            themes={themes}
            customizationLocator={customizationLocator}
            onShareLink={() => undefined}
          />
        </TestHost>,
        container
      );
    });
  }

  function embedCode(): string {
    return container.querySelector("textarea")?.value ?? "";
  }

  function clickButton(label: string) {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.includes(label)
    );
    expect(button).toBeDefined();
    return button!;
  }

  it("hides Embed when there is no passage link", async () => {
    await renderSheet();

    expect(container.textContent).not.toContain("Embed");
  });

  it("builds an iframe for the passage, theme, and customization", async () => {
    await renderSheet({
      shareUrl,
      customizationLocator: "alice.custom-1",
    });

    const embed = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Embed")
    );
    expect(embed).toBeDefined();

    await act(async () => {
      embed!.click();
    });

    const preview = container.querySelector("iframe");
    expect(preview?.getAttribute("src")).toContain("embed=minimal");
    expect(preview?.getAttribute("src")).toContain("app.themeId=system");
    expect(preview?.getAttribute("src")).toContain(
      "customization=alice.custom-1"
    );
    expect(preview?.getAttribute("src")).toContain("verse=2");
    expect(embedCode()).toContain("<iframe");
    expect(embedCode()).toContain("embed=minimal");
    expect(embedCode()).toContain("app.themeId=system");
    expect(embedCode()).toContain("customization=alice.custom-1");
    expect(embedCode()).toContain("verse=2");

    const select = container.querySelector("select");
    expect(select?.value).toBe("system");
    await act(async () => {
      select!.value = "dark";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(embedCode()).toContain("app.themeId=dark");
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain(
      "app.themeId=dark"
    );

    const copy = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Copy"
    );
    await act(async () => {
      copy!.click();
    });
    expect(writeText).toHaveBeenCalledWith(embedCode());
  });

  it("leaves customization off the embed link when none is open", async () => {
    await renderSheet({ shareUrl });

    const embed = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Embed")
    );
    await act(async () => {
      embed!.click();
    });

    expect(embedCode()).not.toContain("customization=");
    expect(
      container.querySelector("iframe")?.getAttribute("src")
    ).not.toContain("customization=");
  });

  it("lists System, Light, and Dark and returns to the share actions", async () => {
    await renderSheet({ shareUrl });

    await act(async () => {
      clickButton("Embed").click();
    });

    const labels = Array.from(
      container.querySelectorAll("option"),
      (option) => option.textContent
    );
    expect(labels).toEqual(["System", "Light", "Dark"]);

    await act(async () => {
      clickButton("Back").click();
    });

    expect(container.textContent).toContain("Share a link");
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("keeps Copy in the footer, clear of the embed code", async () => {
    await renderSheet({ shareUrl });

    await act(async () => {
      clickButton("Embed").click();
    });

    const copy = clickButton("Copy");
    const footer = container.querySelector("footer.sb-share-embed-footer");
    const code = container.querySelector("textarea.sb-share-embed-code");
    const scroll = container.querySelector(".sb-share-embed-scroll");

    expect(footer?.contains(copy)).toBe(true);
    expect(code?.contains(copy)).toBe(false);
    expect(scroll?.contains(code)).toBe(true);
    expect(scroll?.contains(copy)).toBe(false);
  });

  it("copies the embed code and stays on the embed step", async () => {
    await renderSheet({ shareUrl });

    await act(async () => {
      clickButton("Embed").click();
    });
    await act(async () => {
      clickButton("Copy").click();
    });

    expect(writeText).toHaveBeenCalledWith(embedCode());
    expect(container.querySelector("textarea")).not.toBeNull();
    expect(state.app.currentToast.value?.message).toBe("Copied");
  });

  it("tells the user when copying the embed code fails", async () => {
    writeText.mockRejectedValue(new Error("clipboard denied"));
    await renderSheet({ shareUrl });

    await act(async () => {
      clickButton("Embed").click();
    });
    await act(async () => {
      clickButton("Copy").click();
    });

    expect(state.app.currentToast.value?.message).toBe(
      "Couldn't copy the embed code"
    );
    expect(container.querySelector("textarea")).not.toBeNull();
  });

  it("opens Embed from the share sheet with the passage theme and customization", async () => {
    const modals = createModalManager();
    const themes = signal([
      { id: "light", name: "Light" },
      { id: "dark", name: "Dark" },
    ]);
    const customizationLocator = signal("alice.custom-1");

    openShareModal(
      {
        modals,
        app: state.app,
        toast: state.app.toast,
        embedThemes: themes,
        customizationLocator,
      },
      shareUrl
    );

    await act(async () => {
      render(
        <TestHost state={state}>
          <ModalHost manager={modals} />
        </TestHost>,
        container
      );
    });

    await act(async () => {
      clickButton("Embed").click();
    });

    expect(embedCode()).toContain("embed=minimal");
    expect(embedCode()).toContain("app.themeId=system");
    expect(embedCode()).toContain("customization=alice.custom-1");
    expect(embedCode()).toContain("verse=2");
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain(
      "embed=minimal"
    );
  });
});

describe("QuickToolbar embed share", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("carries the theme list and customization into the share sheet", async () => {
    const readingState = state.app.currentReadingState.value!.tab.readingState;
    const themes = signal([{ id: "dark", name: "Dark" }]);
    const customizationLocator = signal("alice.custom-1");

    await act(async () => {
      render(
        <TestHost state={state}>
          <QuickToolbar
            toolsManager={state.tools}
            readingState={readingState}
            playlists={state.playlists}
            annotations={state.annotations}
            features={state.features}
            sharedSession={null}
            toast={state.app.toast}
            modals={state.modals}
            app={state.app}
            readingPlans={state.readingPlans}
            embedThemes={themes}
            customizationLocator={customizationLocator}
          />
          <ModalHost manager={state.modals} />
        </TestHost>,
        container
      );
    });

    const share = container.querySelector<HTMLButtonElement>(
      '[aria-label="Share"]'
    );
    expect(share).not.toBeNull();
    await act(async () => {
      share!.click();
    });

    const embed = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Embed")
    );
    expect(embed).toBeDefined();
    await act(async () => {
      embed!.click();
    });

    const code = container.querySelector("textarea")?.value ?? "";
    expect(code).toContain("embed=minimal");
    expect(code).toContain("app.themeId=system");
    expect(code).toContain("customization=alice.custom-1");
    expect(
      Array.from(container.querySelectorAll("option"), (option) => option.value)
    ).toContain("dark");
  });
});
