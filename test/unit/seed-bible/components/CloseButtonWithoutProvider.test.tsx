import { render } from "preact";
import { act } from "preact/test-utils";
import { CloseButton } from "@packages/seed-bible/seed-bible/components/CloseButton/CloseButton";

// No i18n mock and no I18nProvider: the way an extension that renders into a
// root of its own would use the button.
describe("CloseButton without an I18nProvider", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("uses the label it's given", () => {
    act(() => {
      render(<CloseButton label="Hide" onClose={vi.fn()} />, container);
    });

    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Hide"
    );
  });

  it("falls back to Close without a label", () => {
    act(() => {
      render(<CloseButton onClose={vi.fn()} />, container);
    });

    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Close"
    );
  });
});
