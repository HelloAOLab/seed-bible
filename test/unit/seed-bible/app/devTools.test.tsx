import { render } from "preact";
import { act } from "preact/test-utils";

// Each test loads fresh copies so on/off state never leaks between them, and
// so a build setting stubbed with `vi.stubEnv` is read the way a build would.
async function load() {
  vi.resetModules();
  const devTools =
    await import("@packages/seed-bible/seed-bible/app/devTools/devTools");
  const unlock =
    await import("@packages/seed-bible/seed-bible/app/devTools/devToolsUnlock");
  const components = await import("@packages/seed-bible/seed-bible/components");
  return { ...devTools, ...unlock, ...components };
}

/** Production and alpha builds: `vite build` without `--mode native`. */
function asProductionBuild() {
  vi.stubEnv("DEV", false);
  vi.stubEnv("PROD", true);
}

/** The iPhone and Android apps' build. */
function asNativeBuild() {
  asProductionBuild();
  vi.stubEnv("MODE", "native");
}

function outlined(): Record<string, string> {
  return Object.fromEntries(
    [...document.querySelectorAll("[data-sb-component]")].map((el) => [
      el.className.split(" ")[0],
      el.getAttribute("data-sb-component") ?? "",
    ])
  );
}

let container: HTMLElement;

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  act(() => render(null, container));
  container.remove();
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("dev tools: show shared components", () => {
  it("outlines a shared component while switched on, and clears it when switched off", async () => {
    const { Button, startDevTools, setDevToolEnabled } = await load();
    startDevTools();
    act(() => render(<Button>Save</Button>, container));
    expect(outlined()).toEqual({});

    act(() => setDevToolEnabled("showSharedComponents", true));
    expect(outlined()).toEqual({ "sb-button": "Button" });

    act(() => setDevToolEnabled("showSharedComponents", false));
    expect(outlined()).toEqual({});
  });

  it("outlines components that render after it was switched on", async () => {
    const { IconButton, startDevTools, setDevToolEnabled } = await load();
    startDevTools();
    act(() => setDevToolEnabled("showSharedComponents", true));

    act(() => render(<IconButton icon="close" label="Close" />, container));
    expect(outlined()).toEqual({ "sb-icon-button": "IconButton" });
  });

  it("outlines a portaled Dialog's box rather than its full-screen backdrop", async () => {
    const { Dialog, startDevTools, setDevToolEnabled } = await load();
    startDevTools();
    act(() => setDevToolEnabled("showSharedComponents", true));

    act(() =>
      render(
        <Dialog title="Hello" onClose={() => {}}>
          Body
        </Dialog>,
        container
      )
    );
    expect(
      document.querySelector(".sb-dialog")?.getAttribute("data-sb-component")
    ).toBe("Dialog");
    expect(
      document
        .querySelector(".sb-dialog-backdrop")
        ?.hasAttribute("data-sb-component")
    ).toBe(false);
  });

  it("outlines the controls inside a dialog that was already open when it was switched on", async () => {
    const { Button, Dialog, startDevTools, setDevToolEnabled } = await load();
    startDevTools();
    act(() =>
      render(
        <Dialog title="Hello" onClose={() => {}}>
          <Button>Save</Button>
        </Dialog>,
        container
      )
    );

    act(() => setDevToolEnabled("showSharedComponents", true));

    expect(
      document
        .querySelector(".sb-dialog .sb-button")
        ?.getAttribute("data-sb-component")
    ).toBe("Button");
  });

  it("keeps the switch in step with the screen when the browser won't save it", async () => {
    const { Button, startDevTools, setDevToolEnabled, enabledDevTools } =
      await load();
    startDevTools();
    act(() => render(<Button>Save</Button>, container));
    // What Safari does with site data blocked, or a full storage quota.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    act(() => setDevToolEnabled("showSharedComponents", true));
    expect(enabledDevTools.value.has("showSharedComponents")).toBe(true);
    expect(outlined()).toEqual({ "sb-button": "Button" });

    act(() => setDevToolEnabled("showSharedComponents", false));
    expect(enabledDevTools.value.has("showSharedComponents")).toBe(false);
    expect(outlined()).toEqual({});
  });

  it("remembers being switched on at the next page load", async () => {
    const first = await load();
    first.startDevTools();
    first.setDevToolEnabled("showSharedComponents", true);

    const next = await load();
    next.startDevTools();
    expect(next.enabledDevTools.value.has("showSharedComponents")).toBe(true);
    act(() => render(<next.Button>Save</next.Button>, container));
    expect(outlined()).toEqual({ "sb-button": "Button" });
  });

  it("starts off when nothing is saved, whatever the URL says", async () => {
    window.history.replaceState(null, "", "/?showSharedComponents");
    const { Button, startDevTools, enabledDevTools } = await load();
    startDevTools();

    expect(enabledDevTools.value.size).toBe(0);
    act(() => render(<Button>Save</Button>, container));
    expect(outlined()).toEqual({});
  });

  it("ignores a corrupted saved value instead of failing to start", async () => {
    localStorage.setItem("sb-dev-tools", "{not json");
    const { startDevTools, enabledDevTools } = await load();
    expect(() => startDevTools()).not.toThrow();
    expect(enabledDevTools.value.size).toBe(0);
  });
});

describe("dev tools: unlocking", () => {
  it("is always unlocked in a dev build", async () => {
    const { initDevToolsUnlock, devToolsUnlocked } = await load();
    initDevToolsUnlock();
    expect(devToolsUnlocked.value).toBe(true);
  });

  it("starts locked in a production build", async () => {
    asProductionBuild();
    const { initDevToolsUnlock, devToolsUnlocked } = await load();
    expect(initDevToolsUnlock()).toBe(false);
    expect(devToolsUnlocked.value).toBe(false);
  });

  it("unlocks from ?devTools and remembers it at the next page load", async () => {
    asProductionBuild();
    window.history.replaceState(null, "", "/en/today?devTools");
    const first = await load();
    expect(first.initDevToolsUnlock()).toBe(true);
    expect(first.devToolsUnlocked.value).toBe(true);

    window.history.replaceState(null, "", "/en/today");
    const next = await load();
    expect(next.initDevToolsUnlock()).toBe(false);
    expect(next.devToolsUnlocked.value).toBe(true);
  });

  it("takes ?devTools out of the address without adding a history entry", async () => {
    window.history.replaceState(
      null,
      "",
      "/en/today?devTools&settingsView=main"
    );
    const { removeDevToolsFlag } = await load();
    const { createNavigationManager } =
      await import("@packages/seed-bible/seed-bible/managers/NavigationManager");
    const navigation = createNavigationManager();
    const historyLength = window.history.length;

    removeDevToolsFlag(navigation);

    expect(window.location.pathname).toBe("/en/today");
    expect(window.location.search).toBe("?settingsView=main");
    expect(navigation.currentUrl.value.searchParams.has("devTools")).toBe(
      false
    );
    expect(window.history.length).toBe(historyLength);
    navigation.dispose();
  });

  it("unlocks after seven quick taps, not six", async () => {
    asProductionBuild();
    const { initDevToolsUnlock, countUnlockTap, devToolsUnlocked } =
      await load();
    initDevToolsUnlock();

    for (let i = 0; i < 6; i++) countUnlockTap();
    expect(devToolsUnlocked.value).toBe(false);
    countUnlockTap();
    expect(devToolsUnlocked.value).toBe(true);
  });

  it("starts the count again after a pause between taps", async () => {
    asProductionBuild();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { initDevToolsUnlock, countUnlockTap, devToolsUnlocked } =
        await load();
      initDevToolsUnlock();

      for (let i = 0; i < 6; i++) countUnlockTap();
      vi.setSystemTime(Date.now() + 2000);
      countUnlockTap();
      expect(devToolsUnlocked.value).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("can't be unlocked in the native apps, by taps or by ?devTools", async () => {
    asNativeBuild();
    window.history.replaceState(null, "", "/en/today?devTools");
    const { initDevToolsUnlock, countUnlockTap, devToolsUnlocked } =
      await load();

    expect(initDevToolsUnlock()).toBe(false);
    for (let i = 0; i < 7; i++) countUnlockTap();
    expect(devToolsUnlocked.value).toBe(false);
    expect(localStorage.length).toBe(0);
  });

  it("hiding switches every tool off and locks them again", async () => {
    asProductionBuild();
    const {
      Button,
      initDevToolsUnlock,
      unlockDevTools,
      setDevToolEnabled,
      hideDevTools,
      devToolsUnlocked,
      hasDevToolsOn,
    } = await load();
    initDevToolsUnlock();
    unlockDevTools();
    act(() => setDevToolEnabled("showSharedComponents", true));
    act(() => render(<Button>Save</Button>, container));
    expect(outlined()).toEqual({ "sb-button": "Button" });

    act(() => hideDevTools());

    expect(outlined()).toEqual({});
    expect(devToolsUnlocked.value).toBe(false);
    expect(hasDevToolsOn()).toBe(false);
    const next = await load();
    expect(next.initDevToolsUnlock()).toBe(false);
  });

  it("only asks startup to fetch the tools once one is switched on", async () => {
    const { hasDevToolsOn, setDevToolEnabled } = await load();
    expect(hasDevToolsOn()).toBe(false);
    setDevToolEnabled("showSharedComponents", true);
    expect(hasDevToolsOn()).toBe(true);
    setDevToolEnabled("showSharedComponents", false);
    expect(hasDevToolsOn()).toBe(false);
  });
});
