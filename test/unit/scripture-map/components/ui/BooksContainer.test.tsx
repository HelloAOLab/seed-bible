import { render } from "preact";
import { act } from "preact/test-utils";
import { BooksContainer } from "../../../../../packages/scripture-map/components/ui/BooksContainer";

describe("BooksContainer", () => {
  let container: HTMLDivElement;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    originalResizeObserver = globalThis.ResizeObserver;
    // Avoid observer async paths in these smoke tests.
    // @ts-expect-error -- deleting for the test
    delete globalThis.ResizeObserver;
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    } else {
      // @ts-expect-error -- restore absence
      delete globalThis.ResizeObserver;
    }
  });

  function setup(children?: preact.ComponentChildren, masonry?: boolean) {
    act(() =>
      render(
        <BooksContainer masonry={masonry}>{children}</BooksContainer>,
        container
      )
    );
    return container;
  }

  it("renders the books container without masonry by default", () => {
    setup();
    const wrapper = container.querySelector(".scripture-map-books-container");
    expect(wrapper).not.toBeNull();
    expect(
      wrapper!.classList.contains("scripture-map-books-container-masonry")
    ).toBe(false);
  });

  it("adds the masonry class when masonry is enabled", () => {
    setup(undefined, true);
    const wrapper = container.querySelector(".scripture-map-books-container");
    expect(wrapper).not.toBeNull();
    expect(
      wrapper!.classList.contains("scripture-map-books-container-masonry")
    ).toBe(true);
  });

  it("renders children inside the container", () => {
    setup(<span data-testid="child">Book</span>);
    expect(
      container.querySelector(
        ".scripture-map-books-container [data-testid='child']"
      )
    ).not.toBeNull();
  });

  it("renders multiple children", () => {
    setup(
      <>
        <span data-testid="child-a" />
        <span data-testid="child-b" />
        <span data-testid="child-c" />
      </>
    );
    const wrapper = container.querySelector(".scripture-map-books-container")!;
    expect(wrapper.querySelectorAll("[data-testid]")).toHaveLength(3);
  });

  it("renders with no children", () => {
    setup();
    expect(
      container.querySelector(".scripture-map-books-container")!.children
    ).toHaveLength(0);
  });
});
