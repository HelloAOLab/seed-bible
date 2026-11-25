import { render } from "preact";
import { act } from "preact/test-utils";

// Each test loads fresh copies so on/off state never leaks between them.
async function load() {
  vi.resetModules();
  const devTools =
    await import("@packages/seed-bible/seed-bible/app/devTools/devTools");
  const components = await import("@packages/seed-bible/seed-bible/components");
  return { ...devTools, ...components };
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
