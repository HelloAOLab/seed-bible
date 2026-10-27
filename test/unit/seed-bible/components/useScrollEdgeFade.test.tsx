import { render } from "preact";
import { act } from "preact/test-utils";
import { useCallback, useRef } from "preact/hooks";
import {
  useScrollEdgeFade,
  useScrollEdgeFadeRef,
} from "@packages/seed-bible/seed-bible/components/useScrollEdgeFade";

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

describe("useScrollEdgeFadeRef (vertical)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  /** jsdom does no layout, so a test sets the scroll geometry it wants. */
  interface VerticalGeometry {
    scrollHeight: number;
    clientHeight: number;
    scrollTop: number;
  }

  function withGeometry(node: HTMLElement, geometry: VerticalGeometry) {
    Object.defineProperties(node, {
      scrollHeight: { get: () => geometry.scrollHeight, configurable: true },
      clientHeight: { get: () => geometry.clientHeight, configurable: true },
      scrollTop: { get: () => geometry.scrollTop, configurable: true },
    });
  }

  function List(props: {
    collapsed: boolean;
    items: string[];
    geometry: VerticalGeometry;
  }) {
    const { geometry } = props;
    const fadeRef = useScrollEdgeFadeRef("y");
    // The geometry has to be in place before the fade ref first measures.
    // Stable across renders, like a real ref, so a re-render doesn't
    // re-attach (which would re-measure and hide a missed update).
    const ref = useCallback(
      (node: HTMLDivElement | null) => {
        if (node) withGeometry(node, geometry);
        fadeRef(node);
      },
      [fadeRef, geometry]
    );
    return props.collapsed ? (
      <div className="collapsed" ref={ref} key="collapsed">
        {props.items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    ) : (
      <div className="expanded" ref={ref} key="expanded">
        {props.items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    );
  }

  const fades = (el: Element) => ({
    top: el.hasAttribute("data-fade-top"),
    bottom: el.hasAttribute("data-fade-bottom"),
  });

  it("fades only the edges content is hidden past as the list scrolls", () => {
    const geometry = { scrollHeight: 300, clientHeight: 200, scrollTop: 0 };
    act(() =>
      render(
        <List collapsed={false} items={["a"]} geometry={geometry} />,
        container
      )
    );
    const list = container.querySelector(".expanded")!;
    expect(fades(list)).toEqual({ top: false, bottom: true });

    geometry.scrollTop = 50;
    list.dispatchEvent(new Event("scroll"));
    expect(fades(list)).toEqual({ top: true, bottom: true });

    geometry.scrollTop = 100;
    list.dispatchEvent(new Event("scroll"));
    expect(fades(list)).toEqual({ top: true, bottom: false });
  });

  it("starts fading when an added item makes the list overflow", async () => {
    const geometry = { scrollHeight: 200, clientHeight: 200, scrollTop: 0 };
    act(() =>
      render(
        <List collapsed={false} items={["a"]} geometry={geometry} />,
        container
      )
    );
    const list = container.querySelector(".expanded")!;
    expect(fades(list)).toEqual({ top: false, bottom: false });

    geometry.scrollHeight = 260;
    act(() =>
      render(
        <List collapsed={false} items={["a", "b"]} geometry={geometry} />,
        container
      )
    );
    // MutationObserver callbacks run as a microtask.
    await Promise.resolve();

    expect(fades(list)).toEqual({ top: false, bottom: true });
  });

  it("follows the list when it's swapped for a different element", () => {
    const geometry = { scrollHeight: 300, clientHeight: 200, scrollTop: 0 };
    act(() =>
      render(
        <List collapsed={false} items={["a"]} geometry={geometry} />,
        container
      )
    );
    act(() =>
      render(
        <List collapsed={true} items={["a"]} geometry={geometry} />,
        container
      )
    );
    const collapsed = container.querySelector(".collapsed")!;
    expect(fades(collapsed)).toEqual({ top: false, bottom: true });

    geometry.scrollTop = 100;
    collapsed.dispatchEvent(new Event("scroll"));
    expect(fades(collapsed)).toEqual({ top: true, bottom: false });
  });
});
