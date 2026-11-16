import { hydrate, render } from "preact";
import { act } from "preact/test-utils";
import { renderToString } from "preact-render-to-string";

// The "has the intro played yet" record lives in module state for the page's
// lifetime, so each test loads a fresh copy of the module.
async function loadSeedBibleIcon() {
  vi.resetModules();
  const { SeedBibleIcon } =
    await import("@packages/seed-bible/seed-bible/components/icons");
  return SeedBibleIcon;
}

describe("SeedBibleIcon intro animation", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
  });

  function isAnimating() {
    return container.querySelector(".sb-seed-icon-page") !== null;
  }

  function elapsedVar() {
    return (
      container
        .querySelector<SVGGElement>("svg > g")
        ?.style.getPropertyValue("--sb-seed-icon-elapsed") ?? null
    );
  }

  it("plays the intro from the start the first time an animated icon mounts", async () => {
    const SeedBibleIcon = await loadSeedBibleIcon();

    act(() => render(<SeedBibleIcon animated />, container));

    expect(isAnimating()).toBe(true);
    expect(elapsedVar()).toBe("0ms");
  });

  it("shows the finished icon without replaying when it remounts after the intro, e.g. when a tool is added to the toolbar", async () => {
    const SeedBibleIcon = await loadSeedBibleIcon();
    act(() => render(<SeedBibleIcon animated />, container));
    act(() => render(null, container));

    vi.advanceTimersByTime(5000);
    act(() => render(<SeedBibleIcon animated />, container));

    expect(isAnimating()).toBe(false);
    expect(container.querySelectorAll("svg path")).toHaveLength(1);
  });

  it("resumes the intro where it was, instead of restarting it, when it remounts mid-animation", async () => {
    const SeedBibleIcon = await loadSeedBibleIcon();
    act(() => render(<SeedBibleIcon animated />, container));
    act(() => render(null, container));

    vi.advanceTimersByTime(400);
    act(() => render(<SeedBibleIcon animated />, container));

    expect(isAnimating()).toBe(true);
    expect(elapsedVar()).toBe("400ms");
  });

  it("doesn't count a static icon as having played the intro", async () => {
    const SeedBibleIcon = await loadSeedBibleIcon();
    act(() => render(<SeedBibleIcon />, container));
    expect(isAnimating()).toBe(false);
    act(() => render(null, container));

    vi.advanceTimersByTime(5000);
    act(() => render(<SeedBibleIcon animated />, container));

    expect(isAnimating()).toBe(true);
    expect(elapsedVar()).toBe("0ms");
  });

  it("doesn't count server rendering as having played the intro, so hydration matches the server's markup however long it takes", async () => {
    const SeedBibleIcon = await loadSeedBibleIcon();
    const serverHtml = renderToString(<SeedBibleIcon animated />);

    vi.advanceTimersByTime(5000);
    container.innerHTML = serverHtml;
    act(() => hydrate(<SeedBibleIcon animated />, container));

    expect(container.innerHTML).toBe(serverHtml);
    expect(isAnimating()).toBe(true);
  });
});
