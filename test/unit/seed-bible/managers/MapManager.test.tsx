import { render } from "preact";
import { act } from "preact/test-utils";
import type { ComponentChild } from "preact";
import {
  createMapManager,
  MAP_TILE_SOURCE,
  type GeoJsonObject,
  type LeafletModule,
} from "@packages/seed-bible/seed-bible/managers/MapManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { waitFor } from "../testUtils/createTestSeedBibleState";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const ACCO: GeoJsonObject = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [35.0875, 32.9213] },
  properties: {},
} as GeoJsonObject;

let leaflet: LeafletModule;
let container: HTMLDivElement;

beforeAll(async () => {
  // The real download, once; the tests below hand this copy back instantly.
  leaflet = await createMapManager({ panes: createPanes() }).loadLeaflet();
}, 30_000);

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

/** A download of Leaflet that only finishes when told to. */
function deferredLeaflet() {
  let finish: (succeeded: boolean) => void = () => undefined;
  const importLeaflet = vi.fn(
    () =>
      new Promise<LeafletModule>((resolve, reject) => {
        finish = (succeeded) =>
          succeeded ? resolve(leaflet) : reject(new Error("offline"));
      })
  );
  return { importLeaflet, finish: (succeeded = true) => finish(succeeded) };
}

describe("MapManager", () => {
  describe("loadLeaflet", () => {
    it("downloads the real library on demand", () => {
      expect(typeof leaflet.map).toBe("function");
      expect(typeof leaflet.geoJSON).toBe("function");
    });

    it("downloads once, however many maps ask for it", async () => {
      const download = deferredLeaflet();
      const map = createMapManager({
        panes: createPanes(),
        importLeaflet: download.importLeaflet,
      });

      expect(map.status.value).toBe("idle");
      const first = map.loadLeaflet();
      const second = map.loadLeaflet();
      expect(map.status.value).toBe("loading");

      download.finish();
      await expect(first).resolves.toBe(leaflet);
      await expect(second).resolves.toBe(leaflet);
      await map.loadLeaflet();

      expect(download.importLeaflet).toHaveBeenCalledTimes(1);
      expect(map.status.value).toBe("ready");
      expect(map.leaflet.value).toBe(leaflet);
    });

    it("tries again after a failed download", async () => {
      const importLeaflet = vi
        .fn<() => Promise<LeafletModule>>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(leaflet);
      const map = createMapManager({ panes: createPanes(), importLeaflet });

      await expect(map.loadLeaflet()).rejects.toThrow("offline");
      expect(map.status.value).toBe("failed");
      expect(map.leaflet.value).toBeNull();

      await expect(map.loadLeaflet()).resolves.toBe(leaflet);
      expect(map.status.value).toBe("ready");
      expect(importLeaflet).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps the base map's source and credit in one place", () => {
    const map = createMapManager({ panes: createPanes() });

    expect(map.tileSource).toBe(MAP_TILE_SOURCE);
    expect(MAP_TILE_SOURCE.url).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    );
    expect(MAP_TILE_SOURCE.attribution).toContain("OpenStreetMap");
  });

  describe("openMap", () => {
    function renderPane(panes: ReturnType<typeof createPanes>, id: string) {
      const pane = panes.panes.value.find((candidate) => candidate.id === id);
      const Content = pane!.component as () => ComponentChild;
      act(() => {
        render(<Content />, container);
      });
    }

    it("opens a floating pane and starts the download straight away", () => {
      const panes = createPanes();
      const download = deferredLeaflet();
      const map = createMapManager({
        panes,
        importLeaflet: download.importLeaflet,
      });

      map.openMap({
        id: "acco",
        title: "Acco",
        label: "Acco",
        load: () => new Promise(() => undefined),
      });

      expect(panes.panes.value).toEqual([
        expect.objectContaining({
          id: "acco",
          title: "Acco",
          placement: "floating",
        }),
      ]);
      expect(download.importLeaflet).toHaveBeenCalledTimes(1);
    });

    it("draws the place, with its credits, once its data loads", async () => {
      const panes = createPanes();
      const map = createMapManager({
        panes,
        importLeaflet: () => Promise.resolve(leaflet),
      });
      let answer: (data: GeoJsonObject) => void = () => undefined;

      map.openMap({
        id: "acco",
        title: "Acco",
        label: "Acco",
        load: () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
        attribution: ["Places: Example data"],
      });
      renderPane(panes, "acco");

      expect(container.querySelector(".sb-skeleton")).toBeTruthy();
      expect(container.querySelector(".leaflet-container")).toBeNull();

      await act(async () => answer(ACCO));
      await waitFor(
        () => container.querySelector(".sb-geojson-map-label") !== null
      );

      expect(
        container.querySelector(".sb-geojson-map-label")?.textContent
      ).toBe("Acco");
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
      const map = createMapManager({
        panes,
        importLeaflet: () => Promise.resolve(leaflet),
      });

      map.openMap({ id: "erech", title: "Erech", label: "Erech", load });
      renderPane(panes, "erech");
      await waitFor(() => container.textContent !== "");

      expect(container.textContent).toBe(
        "This place can't be shown on the map."
      );
      expect(container.querySelector(".leaflet-container")).toBeNull();
    });

    it("reopening a place replaces its pane rather than adding one", () => {
      const panes = createPanes();
      const map = createMapManager({
        panes,
        importLeaflet: () => Promise.resolve(leaflet),
      });
      const open = () =>
        map.openMap({
          id: "acco",
          title: "Acco",
          label: "Acco",
          load: () => Promise.resolve(ACCO),
        });

      open();
      open();

      expect(panes.panes.value).toHaveLength(1);
    });
  });
});
