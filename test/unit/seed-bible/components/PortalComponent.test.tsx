import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import { computed, signal } from "@preact/signals";
import {
  PortalComponent,
  type PortalComponentProps,
  type PortalComponentHandle,
} from "@packages/seed-bible/seed-bible/components/PortalComponent/PortalComponent";
import { PaneLayout } from "@packages/seed-bible/seed-bible/components/PaneLayout/PaneLayout";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function iframeOf(container: HTMLElement): HTMLIFrameElement {
  const iframe = container.querySelector(
    "iframe.sb-grid-portal-pane-iframe"
  ) as HTMLIFrameElement | null;
  if (!iframe) {
    throw new Error("Portal iframe not found");
  }
  return iframe;
}

describe("PortalComponent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("builds the iframe URL from its props", () => {
    act(() => {
      render(
        <PortalComponent
          portal="map_portal"
          portalType="map"
          inst="inst-123"
          pattern={{ name: "geo" }}
          query={{ mapData: "hello" }}
        />,
        container
      );
    });

    const url = new URL(iframeOf(container).src);
    expect(url.origin).toBe("https://ao.bot");
    expect(url.searchParams.get("inst")).toBe("inst-123");
    expect(url.searchParams.get("mapPortal")).toBe("map_portal");
    expect(url.searchParams.get("pattern")).toBe("geo");
    expect(url.searchParams.get("mapData")).toBe("hello");
  });

  it("keeps the same iframe src and DOM node when props change on re-render", () => {
    const renderWith = (props: PortalComponentProps) => {
      act(() => {
        render(<PortalComponent {...props} />, container);
      });
    };

    renderWith({
      portal: "map",
      portalType: "map",
      inst: "first-inst",
      pattern: null,
    });

    const iframeBefore = iframeOf(container);
    const srcBefore = iframeBefore.src;
    expect(new URL(srcBefore).searchParams.get("inst")).toBe("first-inst");

    // Re-render the SAME component instance with a different `inst` (this is
    // what a caller that computes `inst` inside its render function does on
    // every re-render). The iframe must NOT be reloaded: same node, same src.
    renderWith({
      portal: "map",
      portalType: "map",
      inst: "second-inst",
      pattern: null,
    });

    const iframeAfter = iframeOf(container);
    expect(iframeAfter).toBe(iframeBefore);
    expect(iframeAfter.src).toBe(srcBefore);
  });
});

describe("PortalComponent postMessage bridge", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("sends messages into the iframe via the imperative handle", () => {
    const ref = createRef<PortalComponentHandle>();

    act(() => {
      render(
        <PortalComponent
          ref={ref}
          portal="map"
          portalType="map"
          inst="inst-1"
          pattern={null}
        />,
        container
      );
    });

    const iframe = iframeOf(container);
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage");

    ref.current?.sendMessage({ type: "highlightFeature", featureId: "abc" });

    expect(postMessage).toHaveBeenCalledWith(
      { type: "highlightFeature", featureId: "abc" },
      "https://ao.bot"
    );
  });

  it("calls onMessage for a message from the portal's own iframe at the trusted origin", () => {
    const onMessage = vi.fn();

    act(() => {
      render(
        <PortalComponent
          portal="map"
          portalType="map"
          inst="inst-1"
          pattern={null}
          onMessage={onMessage}
        />,
        container
      );
    });

    const iframe = iframeOf(container);
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://ao.bot",
        source: iframe.contentWindow,
        data: { type: "featureClicked", featureId: "abc" },
      })
    );

    expect(onMessage).toHaveBeenCalledWith({
      type: "featureClicked",
      featureId: "abc",
    });
  });

  it("ignores a message from an untrusted origin", () => {
    const onMessage = vi.fn();

    act(() => {
      render(
        <PortalComponent
          portal="map"
          portalType="map"
          inst="inst-1"
          pattern={null}
          onMessage={onMessage}
        />,
        container
      );
    });

    const iframe = iframeOf(container);
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example",
        source: iframe.contentWindow,
        data: { type: "featureClicked" },
      })
    );

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("ignores a same-origin message from a different portal's iframe", () => {
    const onMessage = vi.fn();

    act(() => {
      render(
        <PortalComponent
          portal="map"
          portalType="map"
          inst="inst-1"
          pattern={null}
          onMessage={onMessage}
        />,
        container
      );
    });

    // A second, unrelated iframe standing in for a sibling PortalComponent's
    // own ao.bot iframe mounted elsewhere on the page.
    const otherIframe = document.createElement("iframe");
    document.body.appendChild(otherIframe);

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://ao.bot",
        source: otherIframe.contentWindow,
        data: { type: "featureClicked" },
      })
    );

    expect(onMessage).not.toHaveBeenCalled();
    otherIframe.remove();
  });

  it("stops calling onMessage once unmounted", () => {
    const onMessage = vi.fn();

    act(() => {
      render(
        <PortalComponent
          portal="map"
          portalType="map"
          inst="inst-1"
          pattern={null}
          onMessage={onMessage}
        />,
        container
      );
    });

    const iframeContentWindow = iframeOf(container).contentWindow;

    act(() => {
      render(null, container);
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://ao.bot",
        source: iframeContentWindow,
        data: { type: "featureClicked" },
      })
    );

    expect(onMessage).not.toHaveBeenCalled();
  });
});

function makePaneState() {
  const panes = createPanes();
  const state = {
    app: {
      effectivePanes: computed(() => panes.panes.value),
      selectPane: panes.selectPane,
    },
    panes,
    settings: { settings: signal({ uiSize: "M" }) },
  } as unknown as SeedBibleState;
  return { state, panes };
}

describe("PortalComponent inside a dragged floating pane", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("does not reload the portal iframe when the pane is moved", () => {
    const { state, panes } = makePaneState();

    // Mirror the real extension call sites: the pane's component regenerates a
    // random `inst` every time it renders. The frozen URL in PortalComponent is
    // what stops this from reloading the iframe on each drag frame.
    let renderCount = 0;
    panes.openPane({
      id: "portal-pane",
      placement: "floating",
      title: "Map Portal",
      component: () => {
        renderCount += 1;
        return (
          <PortalComponent
            portal="map"
            portalType="map"
            inst={`inst-${renderCount}-${Math.random()}`}
            pattern={null}
          />
        );
      },
    });

    act(() => {
      render(<PaneLayout state={state} />, container);
    });

    const iframeBefore = iframeOf(container);
    const srcBefore = iframeBefore.src;

    // Drive a pointer-driven drag of the pane header.
    const header = container.querySelector(".sb-pane-header");
    act(() => {
      header?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: 60,
          clientY: 60,
        })
      );
    });
    for (const x of [120, 180, 240, 300]) {
      act(() => {
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            clientX: x,
            clientY: x,
          })
        );
      });
    }
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    });

    // The pane re-rendered several times during the drag...
    expect(renderCount).toBeGreaterThan(1);
    // ...but the iframe is the same node with the same src, so its document
    // never reloaded.
    const iframeAfter = iframeOf(container);
    expect(iframeAfter).toBe(iframeBefore);
    expect(iframeAfter.src).toBe(srcBefore);
  });
});
