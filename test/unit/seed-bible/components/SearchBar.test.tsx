import { render } from "preact";
import { act } from "preact/test-utils";
import { useState } from "preact/hooks";
import { SearchBar } from "@packages/seed-bible/seed-bible/components/SearchBar/SearchBar";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

describe("SearchBar", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  /** A screen that keeps the query in its own state, as callers do. */
  function Screen(props: {
    onInput?: (value: string) => void;
    inputRef?: { current: HTMLInputElement | null };
  }) {
    const [value, setValue] = useState("");
    return (
      <SearchBar
        value={value}
        onInput={(next) => {
          setValue(next);
          props.onInput?.(next);
        }}
        placeholder="Search..."
        inputRef={props.inputRef}
      />
    );
  }

  const input = () => container.querySelector<HTMLInputElement>("input")!;
  const clear = () =>
    container.querySelector<HTMLButtonElement>(
      'button[aria-label="Clear search"]'
    );
  const type = (text: string) =>
    act(() => {
      input().value = text;
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("labels the box with its placeholder unless given a label", () => {
    act(() => {
      render(
        <SearchBar value="" onInput={vi.fn()} placeholder="Search..." />,
        container
      );
    });
    expect(input().getAttribute("aria-label")).toBe("Search...");

    act(() => {
      render(
        <SearchBar
          value=""
          onInput={vi.fn()}
          placeholder="Search..."
          aria-label="Search your content"
        />,
        container
      );
    });
    expect(input().getAttribute("aria-label")).toBe("Search your content");
  });

  it("reports typing, and empties the box with the × once there's text", () => {
    const onInput = vi.fn();
    act(() => render(<Screen onInput={onInput} />, container));
    expect(clear()).toBeNull();

    type("psalm");
    expect(onInput).toHaveBeenLastCalledWith("psalm");

    act(() => clear()!.click());
    expect(onInput).toHaveBeenLastCalledWith("");
    expect(input().value).toBe("");
    expect(clear()).toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it("hands the input to a callback ref too", () => {
    const seen: (HTMLInputElement | null)[] = [];
    act(() => {
      render(
        <SearchBar
          value=""
          onInput={vi.fn()}
          placeholder="Search..."
          inputRef={(element) => {
            seen.push(element);
          }}
        />,
        container
      );
    });
    expect(seen.at(-1)).toBe(input());
  });

  it("uses the caller's input ref, so clearing focuses the same box", () => {
    const inputRef: { current: HTMLInputElement | null } = { current: null };
    act(() => render(<Screen inputRef={inputRef} />, container));
    expect(inputRef.current).toBe(input());

    type("john");
    act(() => clear()!.click());
    expect(document.activeElement).toBe(inputRef.current);
  });
});
