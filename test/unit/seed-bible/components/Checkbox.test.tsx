import { render } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import { Checkbox } from "@packages/seed-bible/seed-bible/components/Checkbox/Checkbox";

describe("Checkbox", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function box() {
    return container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  }

  it("is named by its label, and clicking the label ticks it", () => {
    const onToggled = vi.fn();
    act(() => {
      render(
        <Checkbox
          label="Don't show this again"
          checked={false}
          onToggled={onToggled}
        />,
        container
      );
    });

    expect(box().labels?.[0]?.textContent).toBe("Don't show this again");
    expect(box().getAttribute("role")).toBeNull();

    act(() => box().labels![0]!.click());
    expect(onToggled).toHaveBeenCalledWith(true);
  });

  it("keeps a link inside its label working as a link", () => {
    const onToggled = vi.fn();
    act(() => {
      render(
        <Checkbox
          label={
            <>
              I agree to the{" "}
              <a href="#terms" onClick={(event) => event.stopPropagation()}>
                Terms of service
              </a>
            </>
          }
          checked={false}
          onToggled={onToggled}
        />,
        container
      );
    });

    expect(box().labels?.[0]?.textContent).toBe(
      "I agree to the Terms of service"
    );
    expect(container.querySelector("a")!.getAttribute("href")).toBe("#terms");
  });

  it("can stand alone, named by an aria-label", () => {
    act(() => {
      render(
        <Checkbox
          aria-label="Override Translation"
          checked
          onToggled={() => {}}
        />,
        container
      );
    });

    expect(container.querySelector("label")).toBeNull();
    expect(box().getAttribute("aria-label")).toBe("Override Translation");
    expect(box().checked).toBe(true);
  });

  it("doesn't change while disabled", () => {
    const onToggled = vi.fn();
    act(() => {
      render(
        <Checkbox
          label="I agree"
          checked={false}
          disabled
          onToggled={onToggled}
        />,
        container
      );
    });

    act(() => box().labels![0]!.click());
    expect(onToggled).not.toHaveBeenCalled();
    expect(box().checked).toBe(false);
  });

  it("shows a partly ticked list as mixed, and settles when it's ticked", () => {
    // A "Select all" over three pages, one of them ticked.
    function SelectAll() {
      const [ticked, setTicked] = useState(1);
      return (
        <Checkbox
          label="Select all"
          checked={ticked === 3}
          indeterminate={ticked > 0 && ticked < 3}
          onToggled={(checked) => setTicked(checked ? 3 : 0)}
        />
      );
    }
    act(() => {
      render(<SelectAll />, container);
    });
    expect(box().indeterminate).toBe(true);
    expect(box().checked).toBe(false);

    act(() => box().click());
    expect(box().indeterminate).toBe(false);
    expect(box().checked).toBe(true);
  });

  it("stays mixed when it re-renders while still partly ticked", () => {
    function Folder(props: { count: number }) {
      return (
        <Checkbox
          label={`Folder (${props.count})`}
          checked={false}
          indeterminate
          onToggled={() => {}}
        />
      );
    }
    act(() => {
      render(<Folder count={3} />, container);
    });
    // A click clears the element's mixed state even when the caller then
    // keeps it partly ticked.
    act(() => box().click());
    act(() => {
      render(<Folder count={4} />, container);
    });

    expect(box().indeterminate).toBe(true);
  });
});
