import { render } from "preact";
import { act } from "preact/test-utils";
import { useRef } from "preact/hooks";
import { useScrollEdgeFade } from "@packages/seed-bible/seed-bible/components/useScrollEdgeFade";

/** jsdom does no layout, so a test sets the scroll geometry it wants. */
interface Geometry {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
}

describe("useScrollEdgeFade", () => {
  let container: HTMLDivElement;
  let resizeCallbacks: (() => void)[];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    resizeCallbacks = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resizeCallbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.unstubAllGlobals();
  });

  function setup(geometry: Geometry, dir: "ltr" | "rtl" = "ltr") {
    let el: HTMLDivElement | null = null;
    function Row() {
      const ref = useRef<HTMLDivElement | null>(null);
      useScrollEdgeFade(ref);
      return (
        <div
          dir={dir}
          style={{ direction: dir }}
          ref={(node) => {
            ref.current = node;
            if (node) {
              el = node;
              Object.defineProperties(node, {
                scrollWidth: { get: () => geometry.scrollWidth },
                clientWidth: { get: () => geometry.clientWidth },
                scrollLeft: { get: () => geometry.scrollLeft },
              });
            }
          }}
        >
          <button>All</button>
        </div>
      );
    }
    act(() => render(<Row />, container));
    const row = el as unknown as HTMLDivElement;
    return {
      row,
      fades: () => ({
        left: row.hasAttribute("data-fade-left"),
        right: row.hasAttribute("data-fade-right"),
      }),
      scrollTo(scrollLeft: number) {
        geometry.scrollLeft = scrollLeft;
        row.dispatchEvent(new Event("scroll"));
      },
    };
  }

  it("fades neither edge when everything fits", () => {
    const { fades } = setup({
      scrollWidth: 200,
      clientWidth: 200,
      scrollLeft: 0,
    });

    expect(fades()).toEqual({ left: false, right: false });
  });

  it("fades only the edges content is hidden past as the row scrolls", () => {
    const { fades, scrollTo } = setup({
      scrollWidth: 300,
      clientWidth: 200,
      scrollLeft: 0,
    });
    expect(fades()).toEqual({ left: false, right: true });

    scrollTo(50);
    expect(fades()).toEqual({ left: true, right: true });

    scrollTo(100);
    expect(fades()).toEqual({ left: true, right: false });
  });

  it("ignores sub-pixel rounding at the ends", () => {
    const { fades } = setup({
      scrollWidth: 300.5,
      clientWidth: 300,
      scrollLeft: 0,
    });

    expect(fades()).toEqual({ left: false, right: false });
  });

  it("mirrors the edges for right-to-left text", () => {
    // Right-to-left rows start scrolled to the right edge at 0 and go
    // negative towards the left.
    const { fades, scrollTo } = setup(
      { scrollWidth: 300, clientWidth: 200, scrollLeft: 0 },
      "rtl"
    );
    expect(fades()).toEqual({ left: true, right: false });

    scrollTo(-100);
    expect(fades()).toEqual({ left: false, right: true });
  });

  it("starts fading when the row is resized narrower than its pills", () => {
    const geometry = { scrollWidth: 200, clientWidth: 200, scrollLeft: 0 };
    const { fades } = setup(geometry);
    expect(fades()).toEqual({ left: false, right: false });

    geometry.clientWidth = 150;
    act(() => resizeCallbacks.forEach((callback) => callback()));

    expect(fades()).toEqual({ left: false, right: true });
  });
});
