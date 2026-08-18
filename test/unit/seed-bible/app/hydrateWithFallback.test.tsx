import { afterEach, describe, expect, it } from "vitest";
import { hydrateWithFallback } from "@packages/seed-bible/seed-bible/app/hydrateWithFallback";

/**
 * A component that throws on its first render and renders normally after
 * that — used to force a genuine failure partway through Preact's real
 * `diff()`, so the resulting `container.__k` bookkeeping is authentically
 * corrupted rather than simulated via a mock.
 */
function makeThrowsOnce() {
  let calls = 0;
  return function ThrowsOnce() {
    calls++;
    if (calls === 1) {
      throw new Error("boom");
    }
    return <div>recovered</div>;
  };
}

function makeAlwaysThrows() {
  return function AlwaysThrows(): never {
    throw new Error("boom");
  };
}

function appendContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "app";
  container.setAttribute("data-preserved", "yes");
  container.innerHTML = "<p>server-rendered content</p>";
  document.body.appendChild(container);
  return container;
}

describe("hydrateWithFallback", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("falls back to a full render() on a fresh element when hydration throws", () => {
    const container = appendContainer();
    const ThrowsOnce = makeThrowsOnce();

    const result = hydrateWithFallback(<ThrowsOnce />, container);

    expect(result.outcome).toBe("fell-back");
    if (result.outcome !== "fell-back") throw new Error("unreachable");
    expect(result.hydrateError).toBeInstanceOf(Error);
    expect((result.hydrateError as Error).message).toBe("boom");

    // The original container is no longer attached to the document — a
    // fresh element (Preact has never touched) took its place instead.
    expect(container.isConnected).toBe(false);

    const replacement = document.getElementById("app");
    expect(replacement).not.toBeNull();
    expect(replacement).not.toBe(container);
    expect(replacement?.getAttribute("data-preserved")).toBe("yes");
    expect(replacement?.textContent).toBe("recovered");
  });

  it("leaves a plain fallback message when the fallback render() also fails", () => {
    const container = appendContainer();
    const AlwaysThrows = makeAlwaysThrows();

    const result = hydrateWithFallback(<AlwaysThrows />, container);

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") throw new Error("unreachable");
    expect((result.hydrateError as Error).message).toBe("boom");
    expect((result.renderError as Error).message).toBe("boom");

    const replacement = document.getElementById("app");
    expect(replacement).not.toBeNull();
    expect(replacement?.textContent).toContain("refresh");
  });

  it("renders directly onto document.body instead of replacing it", () => {
    const originalBody = document.body;
    originalBody.innerHTML = "<p>server-rendered content</p>";
    const ThrowsOnce = makeThrowsOnce();

    const result = hydrateWithFallback(<ThrowsOnce />, document.body);

    expect(result.outcome).toBe("fell-back");
    // `document.body` itself must never be swapped out — only its content
    // changes.
    expect(document.body).toBe(originalBody);
    expect(document.body.textContent).toBe("recovered");
  });
});
