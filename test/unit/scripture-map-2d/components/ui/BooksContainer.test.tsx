import { render } from "preact";
import { act } from "preact/test-utils";
import { BooksContainer } from "scriptureMap2D.components.ui.BooksContainer";

describe("BooksContainer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  function setup(children?: preact.ComponentChildren) {
    act(() => render(<BooksContainer>{children}</BooksContainer>, container));
    return container;
  }

  it("renders the .scripture-map-books-container div", () => {
    setup();
    expect(
      container.querySelector(".scripture-map-books-container")
    ).not.toBeNull();
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
