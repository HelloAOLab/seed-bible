import { render } from "preact";
import { act } from "preact/test-utils";
import type { GeoJsonObject } from "geojson";
import {
  createLeafletLoader,
  GeoJsonMap,
  leafletLoader,
  type LeafletModule,
} from "@packages/maps";
import { waitFor } from "../seed-bible/testUtils/createTestSeedBibleState";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

function point(longitude: number, latitude: number): GeoJsonObject {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {},
  } as GeoJsonObject;
}

const ACCO = point(35.0875, 32.9213);

/** A box around Crete, about 250 km across. */
const CRETE_OUTLINE = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [23.5, 34.9],
        [26.3, 34.9],
        [26.3, 35.7],
        [23.5, 35.7],
        [23.5, 34.9],
      ],
    ],
  },
  properties: {},
} as GeoJsonObject;

const JERUSALEM_OUTLINE = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [35.2257, 31.7728],
        [35.2376, 31.7728],
        [35.2376, 31.7837],
        [35.2257, 31.7837],
        [35.2257, 31.7728],
      ],
    ],
  },
  properties: {},
} as GeoJsonObject;

let leaflet: LeafletModule;
let container: HTMLDivElement;

beforeAll(async () => {
  leaflet = await leafletLoader.load();
}, 30_000);

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

async function show(element: preact.JSX.Element) {
  act(() => {
    render(element, container);
  });
  await waitFor(
    () =>
      container.querySelector(".leaflet-container") !== null ||
      container.querySelector(".sb-geojson-map-message") !== null
  );
}

/**
 * Shows a map, then lays it out at 300 by 200. jsdom gives every element a
 * size of 0, so the map is first drawn the way it would be in a box that
 * hasn't been laid out yet, and fits its data again once it has a size.
 */
async function showSized(element: preact.JSX.Element) {
  const resized: Array<() => void> = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resized.push(callback);
      }
      observe() {}
      disconnect() {}
    }
  );
  try {
    await show(element);
    const canvas = container.querySelector(".leaflet-container")!;
    Object.defineProperty(canvas, "clientWidth", { value: 300 });
    Object.defineProperty(canvas, "clientHeight", { value: 200 });
    act(() => resized.forEach((callback) => callback()));
  } finally {
    vi.unstubAllGlobals();
  }
}

/** The zoom levels of the base-map tiles currently shown. */
function zooms(): string[] {
  return [...new Set(tiles().map((tile) => tile.split("/")[0]!))];
}

/** The base-map tiles the map asked for, as `z/x/y`. */
function tiles(): string[] {
  return Array.from(container.querySelectorAll("img.leaflet-tile")).map((img) =>
    new URL(img.getAttribute("src")!).pathname.slice(1).replace(".png", "")
  );
}

describe("GeoJsonMap", () => {
  it("holds its space until the map library arrives, then draws", async () => {
    let finish: () => void = () => undefined;
    const loader = createLeafletLoader(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(leaflet);
        })
    );

    act(() => {
      render(
        <GeoJsonMap loader={loader} data={ACCO} label="Acco" />,
        container
      );
    });
    expect(container.querySelector(".sb-skeleton")).toBeTruthy();
    expect(container.querySelector(".leaflet-container")).toBeNull();

    await act(async () => finish());
    await waitFor(() => container.querySelector(".leaflet-container") !== null);

    expect(container.querySelector(".sb-skeleton")).toBeNull();
    expect(container.querySelector(".sb-geojson-map-point")).toBeTruthy();
  });

  it("centres a lone point on where it is", async () => {
    await show(<GeoJsonMap data={ACCO} />);

    // Zoom 10's tile over Acco, on the coast north of Haifa. Read the other
    // way round, the same numbers land in Cyprus: tile 10/605/405.
    expect(tiles()).toEqual(["10/611/412"]);
  });

  it("goes back to the place after the reader has moved away", async () => {
    await show(<GeoJsonMap data={ACCO} />);
    const zoomOut = container.querySelector(
      ".leaflet-control-zoom-out"
    ) as HTMLElement;

    act(() => zoomOut.click());
    act(() => zoomOut.click());
    expect(tiles().some((tile) => tile.startsWith("10/"))).toBe(false);

    const recenter = container.querySelector(
      ".sb-geojson-map-recenter"
    ) as HTMLButtonElement;
    expect(recenter.getAttribute("aria-label")).toBe("Back to the place");
    act(() => recenter.click());

    expect(tiles()).toContain("10/611/412");
  });

  it("stacks the caller's controls above the recenter button", async () => {
    await show(
      <GeoJsonMap
        data={ACCO}
        controls={<button className="extra">Open</button>}
      />
    );

    const controls = container.querySelector(".sb-geojson-map-controls");
    expect(
      Array.from(controls?.children ?? []).map((child) => child.className)
    ).toEqual(["extra", "sb-geojson-map-control sb-geojson-map-recenter"]);
  });

  it("offers no recenter button until there is a map to move", () => {
    const loader = createLeafletLoader(() => new Promise(() => undefined));

    act(() => {
      render(<GeoJsonMap loader={loader} data={ACCO} />, container);
    });

    expect(container.querySelector(".sb-geojson-map-recenter")).toBeNull();
  });

  it("credits the base map and the place data", async () => {
    await show(
      <GeoJsonMap
        data={ACCO}
        attribution={['Places: <a href="https://example.test">Example</a>']}
      />
    );

    const credits = container.querySelector(".leaflet-control-attribution");
    expect(credits?.textContent).toContain("© OpenStreetMap");
    expect(credits?.textContent).toContain("Places: Example");
    // Only the credits that are owed, not a link to the map library.
    expect(credits?.textContent).not.toContain("Leaflet");
    expect(credits?.querySelector("svg")).toBeNull();
  });

  it("labels the place, as text", async () => {
    await show(<GeoJsonMap data={ACCO} label="<b>Acco</b>" />);

    const label = container.querySelector(".sb-geojson-map-label");
    expect(label?.textContent).toBe("<b>Acco</b>");
    expect(label?.querySelector("b")).toBeNull();
    expect(
      container.querySelector(".sb-geojson-map")?.getAttribute("aria-label")
    ).toBe("<b>Acco</b>");
  });

  it("fits an outline into view", async () => {
    await show(<GeoJsonMap data={JERUSALEM_OUTLINE} />);

    expect(container.querySelector(".sb-geojson-map-shape")).toBeTruthy();
  });

  it("frames a large outline again once a map drawn with no size gets one", async () => {
    await showSized(<GeoJsonMap data={CRETE_OUTLINE} />);

    // The whole island fits a 300 by 200 box at zoom 6.
    expect(zooms()).toEqual(["6"]);
  });

  it("fits a small outline as closely as it fits, closer than a lone point", async () => {
    await showSized(<GeoJsonMap data={JERUSALEM_OUTLINE} />);

    // About a kilometre across: zoom 14 frames it in a 300 by 200 box.
    expect(zooms()).toEqual(["14"]);
  });

  it("keeps points close together at a lone point's zoom", async () => {
    const twoPoints = {
      type: "Feature",
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [35.2257, 31.7728],
          [35.2376, 31.7837],
        ],
      },
      properties: {},
    } as GeoJsonObject;

    await showSized(<GeoJsonMap data={twoPoints} />);

    expect(zooms()).toEqual(["10"]);
  });

  it("offers to try again when the map library fails to download", async () => {
    const importLeaflet = vi
      .fn<() => Promise<LeafletModule>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(leaflet);
    const loader = createLeafletLoader(importLeaflet);

    await show(<GeoJsonMap loader={loader} data={ACCO} />);
    expect(container.textContent).toContain("The map couldn't load.");

    const retry = container.querySelector(
      ".sb-geojson-map-retry"
    ) as HTMLButtonElement;
    await act(async () => retry.click());
    await waitFor(
      () => container.querySelector(".sb-geojson-map-point") !== null
    );

    expect(container.textContent).not.toContain("The map couldn't load.");
  });

  it("says the place can't be shown when the data isn't GeoJSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await show(
      <GeoJsonMap data={{ type: "NotGeoJson" } as unknown as GeoJsonObject} />
    );
    await waitFor(
      () => container.querySelector(".sb-geojson-map-message") !== null
    );

    expect(container.textContent).toBe("This place can't be shown on the map.");
    expect(container.querySelector(".leaflet-pane")).toBeNull();
  });

  it("doesn't add a landmark for an inline map, which its card already names", async () => {
    await show(<GeoJsonMap data={ACCO} label="Acco" inline />);

    const map = container.querySelector(".sb-geojson-map");
    expect(map?.getAttribute("role")).toBeNull();
    expect(map?.getAttribute("aria-label")).toBeNull();
    // Still labelled on the map itself.
    expect(container.querySelector(".sb-geojson-map-label")?.textContent).toBe(
      "Acco"
    );
  });

  it("lets the wheel scroll past an inline map instead of zooming it", async () => {
    await show(<GeoJsonMap data={ACCO} inline />);

    expect(wheelZooms()).toBe(false);
  });

  it("zooms a full map with the wheel", async () => {
    await show(<GeoJsonMap data={ACCO} />);

    expect(wheelZooms()).toBe(true);
  });

  it("can be closed in the middle of a wheel zoom", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      await show(<GeoJsonMap data={ACCO} />);
      wheelZooms();

      // Leaflet zooms a moment after the wheel; the map is gone by then.
      act(() => render(null, container));

      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });

  describe("inline on a phone", () => {
    beforeEach(() => {
      setMobile(true);
    });

    afterEach(() => {
      setMobile(false);
    });

    it("is a still preview, without zoom or recenter buttons", async () => {
      await show(<GeoJsonMap data={ACCO} inline />);

      expect(container.querySelector(".leaflet-control-zoom")).toBeNull();
      expect(container.querySelector(".sb-geojson-map-recenter")).toBeNull();
    });

    it("calls onTap when tapped", async () => {
      const onTap = vi.fn();
      await show(<GeoJsonMap data={ACCO} inline onTap={onTap} />);

      tap();

      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it("keeps its zoom buttons as a full map", async () => {
      const onTap = vi.fn();
      await show(<GeoJsonMap data={ACCO} onTap={onTap} />);

      expect(container.querySelector(".leaflet-control-zoom")).not.toBeNull();
      tap();
      expect(onTap).not.toHaveBeenCalled();
    });
  });

  it("can still be moved inline on a computer, so a click doesn't call onTap", async () => {
    const onTap = vi.fn();
    await show(<GeoJsonMap data={ACCO} inline onTap={onTap} />);

    expect(container.querySelector(".leaflet-control-zoom")).not.toBeNull();
    tap();
    expect(onTap).not.toHaveBeenCalled();
  });
});

/** Makes Leaflet take the device for a phone, or not. */
function setMobile(isMobile: boolean) {
  Object.defineProperty(leaflet.Browser, "mobile", {
    value: isMobile,
    configurable: true,
  });
}

/** A tap (or click) in the middle of the map. */
function tap() {
  container
    .querySelector(".leaflet-container")
    ?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 50, clientY: 50 })
    );
}

/** Whether a wheel over the map zooms it, which stops the page scrolling. */
function wheelZooms(): boolean {
  const event = new WheelEvent("wheel", {
    deltaY: 100,
    bubbles: true,
    cancelable: true,
  });
  container.querySelector(".leaflet-container")?.dispatchEvent(event);
  return event.defaultPrevented;
}
