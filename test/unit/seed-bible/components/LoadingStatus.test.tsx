import { render } from "preact";
import { act } from "preact/test-utils";
import { LoadingStatus } from "@packages/seed-bible/seed-bible/components/LoadingStatus/LoadingStatus";

describe("LoadingStatus", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  const show = (node: preact.ComponentChild) =>
    act(() => render(node, container));
  const root = () => container.firstElementChild as HTMLElement;

  it("says what it is waiting for, as a status screen readers announce", () => {
    show(<LoadingStatus>Loading books…</LoadingStatus>);

    expect(root().getAttribute("role")).toBe("status");
    expect(root().lastElementChild?.textContent).toBe("Loading books…");
  });

  it("hides the spinner from screen readers so its icon name isn't read out", () => {
    show(<LoadingStatus>Loading…</LoadingStatus>);

    const spinner = root().querySelector(".sb-spinner")!;
    expect(spinner).not.toBeNull();
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    // Only the words are left to hear.
    const announced = [...root().children]
      .filter((child) => child.getAttribute("aria-hidden") !== "true")
      .map((child) => child.textContent);
    expect(announced).toEqual(["Loading…"]);
  });

  it("is a line beside its spinner by default, and a bigger stacked one for a screen", () => {
    show(<LoadingStatus>Loading…</LoadingStatus>);
    expect(root().classList).toContain("sb-loading-status-inline");
    expect(
      root().querySelector<HTMLElement>(".sb-spinner")!.style.fontSize
    ).toBe("1em");

    show(<LoadingStatus size="panel">Loading…</LoadingStatus>);
    expect(root().classList).toContain("sb-loading-status-panel");
    expect(
      root().querySelector<HTMLElement>(".sb-spinner")!.style.fontSize
    ).toBe("1.75rem");
  });

  it("keeps the caller's classes and passes attributes through", () => {
    show(
      <LoadingStatus className="sb-x" class="sb-y" id="loading">
        Loading…
      </LoadingStatus>
    );

    expect(root().classList).toContain("sb-x");
    expect(root().classList).toContain("sb-y");
    expect(root().id).toBe("loading");
  });
});
