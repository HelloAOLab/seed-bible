import { render } from "preact";
import { act } from "preact/test-utils";
import { Spinner } from "@packages/seed-bible/seed-bible/components/Spinner/Spinner";

describe("Spinner", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("matches the surrounding text size and stays hidden from assistive tech", () => {
    act(() => {
      render(<Spinner />, container);
    });

    const spinner = container.querySelector<HTMLElement>(".sb-spinner")!;
    expect(spinner).not.toBeNull();
    expect(spinner.textContent).toBe("progress_activity");
    expect(spinner.style.fontSize).toBe("1em");
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    expect(spinner.getAttribute("aria-label")).toBeNull();
  });

  it("takes a size and a label when it is the only thing on screen", () => {
    act(() => {
      render(<Spinner size="0.875rem" label="Opening playlist" />, container);
    });

    const spinner = container.querySelector<HTMLElement>(".sb-spinner")!;
    expect(spinner.style.fontSize).toBe("0.875rem");
    expect(spinner.getAttribute("aria-hidden")).toBeNull();
    expect(spinner.getAttribute("aria-label")).toBe("Opening playlist");
    expect(spinner.getAttribute("role")).toBe("status");
  });
});
