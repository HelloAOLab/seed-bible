import { render } from "preact";
import { act } from "preact/test-utils";
import type { ComponentChild } from "preact";
import { signal } from "@preact/signals";
import type { GeoJsonObject } from "geojson";
import {
  isMapOpen,
  leafletLoader,
  openMap,
  type MapData,
  type OpenMapOptions,
} from "@packages/maps";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { waitFor } from "../seed-bible/testUtils/createTestSeedBibleState";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const ACCO: GeoJsonObject = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [35.0875, 32.9213] },
  properties: {},
} as GeoJsonObject;

let container: HTMLDivElement;

beforeAll(async () => {
  await leafletLoader.load();
}, 30_000);

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

function acco(overrides: Partial<OpenMapOptions> = {}): OpenMapOptions {
  return {
    id: "acco",
    title: "Acco",
    label: "Acco",
    load: () => Promise.resolve({ data: ACCO }),
    ...overrides,
  };
}

function renderPane(panes: ReturnType<typeof createPanes>, id: string) {
  const pane = panes.panes.value.find((candidate) => candidate.id === id);
  const Content = pane!.component as () => ComponentChild;
  act(() => {
    render(<Content />, container);
  });
}

describe("openMap", () => {
  it("starts downloading Leaflet as soon as a map opens", async () => {
    // A fresh copy of the package, so its Leaflet hasn't been asked for yet.
    vi.resetModules();
    const fresh = await import("@packages/maps");
    expect(fresh.leafletLoader.status.value).toBe("idle");

    fresh.openMap(
      { panes: createPanes() },
      acco({ load: () => new Promise(() => undefined) })
    );

    expect(fresh.leafletLoader.status.value).toBe("loading");
  });

  it("opens a floating pane titled after the place", () => {
    const panes = createPanes();

    openMap({ panes }, acco());

    expect(panes.panes.value).toEqual([
      expect.objectContaining({
        id: "acco",
        title: "Acco",
        placement: "floating",
      }),
    ]);
  });

  it("draws the place, with its credits, once its data loads", async () => {
    const panes = createPanes();
    let answer: (map: MapData) => void = () => undefined;

    openMap(
      { panes },
      acco({
        load: () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      })
    );
    renderPane(panes, "acco");

    expect(container.querySelector(".sb-skeleton")).toBeTruthy();
    expect(container.querySelector(".leaflet-container")).toBeNull();

    await act(async () =>
      answer({ data: ACCO, attribution: ["Places: Example data"] })
    );
    await waitFor(
      () => container.querySelector(".sb-geojson-map-label") !== null
    );

    expect(container.querySelector(".sb-geojson-map-label")?.textContent).toBe(
      "Acco"
    );
    const credits = container.querySelector(
      ".leaflet-control-attribution"
    )?.textContent;
    expect(credits).toContain("OpenStreetMap");
    expect(credits).toContain("Places: Example data");
  });

  it.each([
    ["has no data", () => Promise.resolve(null)],
    ["fails to load", () => Promise.reject(new Error("offline"))],
  ])("says so when the place %s", async (_case, load) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const panes = createPanes();

    openMap({ panes }, acco({ load }));
    renderPane(panes, "acco");
    await waitFor(() => container.textContent !== "");

    expect(container.textContent).toBe("This place can't be shown on the map.");
    expect(container.querySelector(".leaflet-container")).toBeNull();
  });

  it("brings an open place forward instead of reloading it", async () => {
    const panes = createPanes();
    const load = vi.fn(() => Promise.resolve<MapData>({ data: ACCO }));

    openMap({ panes }, acco({ load }));
    renderPane(panes, "acco");
    openMap({ panes }, acco({ load }));
    renderPane(panes, "acco");
    await waitFor(
      () => container.querySelector(".sb-geojson-map-point") !== null
    );

    expect(panes.panes.value).toHaveLength(1);
    // A replaced pane would have loaded, and drawn, the place again.
    expect(load).toHaveBeenCalledTimes(1);
  });

  describe("on a phone", () => {
    function phoneWithDiscoverOpen() {
      const isMobile = signal(true);
      const panes = createPanes(isMobile);
      const modals = createModalManager();
      panes.openPane({
        id: "discover-pane",
        placement: "side",
        title: "Discover",
        component: () => null,
      });
      return { isMobile, panes, modals, host: { panes, modals, isMobile } };
    }

    it("opens a sheet over Discover instead of a pane, so Discover stays as it was", () => {
      const { panes, modals, host } = phoneWithDiscoverOpen();
      const discover = panes.panes.value[0];

      openMap(host, acco());

      expect(modals.modals.value).toEqual([
        expect.objectContaining({
          id: "acco",
          title: "Acco",
          mobileSheet: true,
        }),
      ]);
      // A pane would have closed Discover; the sheet leaves it untouched.
      expect(panes.panes.value).toEqual([discover]);
    });

    it("fills the sheet with the place's map", async () => {
      const { modals, host } = phoneWithDiscoverOpen();
      openMap(host, acco());

      const Content = () =>
        modals.modals.value[0]!.content({ t: (key) => key }) as ComponentChild;
      act(() => {
        render(<Content />, container);
      });
      await waitFor(
        () =>
          container.querySelector(".sb-map-sheet .sb-geojson-map-point") !==
          null
      );
    });

    it("leaves a sheet that's already open as it is, rather than reloading it", async () => {
      const { modals, host } = phoneWithDiscoverOpen();
      const load = vi.fn(() => Promise.resolve<MapData>({ data: ACCO }));
      const Content = () =>
        modals.modals.value[0]!.content({ t: (key) => key }) as ComponentChild;

      openMap(host, acco({ load }));
      act(() => {
        render(<Content />, container);
      });
      openMap(host, acco({ load }));
      act(() => {
        render(<Content />, container);
      });
      await waitFor(
        () => container.querySelector(".sb-geojson-map-point") !== null
      );

      expect(modals.modals.value).toHaveLength(1);
      expect(load).toHaveBeenCalledTimes(1);
    });

    it("opens the floating pane once the screen is wider", () => {
      const { isMobile, panes, modals, host } = phoneWithDiscoverOpen();
      isMobile.value = false;

      openMap(host, acco());

      expect(modals.modals.value).toEqual([]);
      expect(panes.panes.value.map((pane) => pane.id)).toEqual([
        "discover-pane",
        "acco",
      ]);
    });
  });
});

describe("isMapOpen", () => {
  it("follows the map's pane", () => {
    const panes = createPanes();

    expect(isMapOpen({ panes }, "acco")).toBe(false);
    openMap({ panes }, acco());
    expect(isMapOpen({ panes }, "acco")).toBe(true);
    expect(isMapOpen({ panes }, "erech")).toBe(false);
    panes.closePane("acco");
    expect(isMapOpen({ panes }, "acco")).toBe(false);
  });

  it("follows the map's sheet on a phone", () => {
    const isMobile = signal(true);
    const panes = createPanes(isMobile);
    const modals = createModalManager();

    openMap({ panes, modals, isMobile }, acco());
    expect(isMapOpen({ panes, modals }, "acco")).toBe(true);

    modals.dismissModal("acco");
    expect(isMapOpen({ panes, modals }, "acco")).toBe(false);
  });
});
