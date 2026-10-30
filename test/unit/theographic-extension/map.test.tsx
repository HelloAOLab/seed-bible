import { render } from "preact";
import { act } from "preact/test-utils";
import type { ComponentChild } from "preact";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import {
  createMapManager,
  type LeafletModule,
} from "@packages/seed-bible/seed-bible/managers/MapManager";
import {
  canMapPlace,
  createIsPlaceOpen,
  createOpenPlace,
  findKnownLocation,
  placePaneId,
  resolvePlaceMapData,
  type PlaceLocations,
} from "@packages/theographic-extension/ext_theographic/map";
import type { TheographicPlaceEntry } from "@packages/theographic-extension/ext_theographic/provider";
import {
  getPlaceAttribution,
  toStandardGeoJson,
} from "@packages/bible-locations";
import { waitFor } from "../seed-bible/testUtils/createTestSeedBibleState";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

let leaflet: LeafletModule;
let container: HTMLDivElement;

beforeAll(async () => {
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

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function place(
  name: string,
  position: { latitude?: number; longitude?: number } = {}
): TheographicPlaceEntry {
  const id = `${name.toLowerCase().replace(/\W+/g, "_")}_1`;
  return {
    id,
    name,
    apiLink: `/api/d/theographic/places/${id}.json`,
    verses: [1],
    ...position,
  };
}

/** A stand-in for `@seed-bible/bible-locations`, listing a few places. */
function fakeLocations(): PlaceLocations & {
  findLocation: ReturnType<typeof vi.fn>;
} {
  const table: Record<string, { place: string; geojson: string }> = {
    erech: { place: "Erech", geojson: "Erech" },
    jerusalem: { place: "Jerusalem", geojson: "m66c5b8" },
    bethel: { place: "Bethel", geojson: "Bethel" },
  };
  return {
    findLocation: vi.fn((name: string) => table[name.toLowerCase()] ?? null),
    getPlaceGeoJsonUrl: (entry) => `https://files.test/${entry.geojson}.json`,
    toStandardGeoJson,
    getPlaceAttribution,
  };
}

function readyMap(panes = createPanes()) {
  return createMapManager({
    panes,
    importLeaflet: () => Promise.resolve(leaflet),
  });
}

describe("findKnownLocation", () => {
  it("looks the name up in the known places", () => {
    expect(findKnownLocation("Jerusalem", fakeLocations())).toEqual({
      place: "Jerusalem",
      geojson: "m66c5b8",
    });
  });

  it("drops the dataset's qualifier when the full name isn't listed", () => {
    expect(findKnownLocation("Bethel (of Palestine)", fakeLocations())).toEqual(
      { place: "Bethel", geojson: "Bethel" }
    );
  });

  it("answers null for a place the extension doesn't list", () => {
    expect(findKnownLocation("Abana", fakeLocations())).toBeNull();
  });

  it("answers null without a known-places lookup", () => {
    expect(findKnownLocation("Erech", undefined)).toBeNull();
  });
});

describe("canMapPlace", () => {
  it("can map a place that is listed or has coordinates, and nothing else", () => {
    const locations = fakeLocations();

    expect(canMapPlace(place("Erech"), locations)).toBe(true);
    expect(
      canMapPlace(
        place("Abana", { latitude: 33.5, longitude: 36.3 }),
        locations
      )
    ).toBe(true);
    expect(canMapPlace(place("Abana"), locations)).toBe(false);
    expect(canMapPlace(place("Erech"), undefined)).toBe(false);
  });
});

describe("resolvePlaceMapData", () => {
  it("fetches an OpenBible place's file as it is, with OpenBible's credit", async () => {
    const geojson = { type: "FeatureCollection", features: [] };
    const getResource = vi.fn().mockResolvedValue(geojson);

    await expect(
      resolvePlaceMapData(place("Jerusalem"), {
        client: { getResource },
        locations: fakeLocations(),
      })
    ).resolves.toEqual({
      data: geojson,
      attribution: getPlaceAttribution({
        place: "Jerusalem",
        geojson: "m66c5b8",
      }),
    });
    expect(getResource).toHaveBeenCalledWith("https://files.test/m66c5b8.json");
  });

  it("flips a hand-built place's file into standard order", async () => {
    const getResource = vi.fn().mockResolvedValue({
      type: "Feature",
      geometry: { type: "Point", coordinates: ["31.3222", "45.6361"] },
      properties: { id: "Erech" },
    });

    const resolved = await resolvePlaceMapData(place("Erech"), {
      client: { getResource },
      locations: fakeLocations(),
    });

    expect(resolved).toEqual({
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [45.6361, 31.3222] },
        properties: { id: "Erech" },
      },
      attribution: [],
    });
  });

  it("draws a large file rather than falling back to the coordinates", async () => {
    // Crete's outline, about 450 KB, was too long for the old map's URL.
    const outline = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [Array.from({ length: 20_000 }, () => [24.5, 35.2])],
      },
      properties: {},
    };
    const getResource = vi.fn().mockResolvedValue(outline);

    const resolved = await resolvePlaceMapData(
      place("Jerusalem", { latitude: 31.78, longitude: 35.23 }),
      { client: { getResource }, locations: fakeLocations() }
    );

    expect(resolved?.data).toBe(outline);
  });

  it("builds a point for an unlisted place, leaving the credit to the card", async () => {
    const getResource = vi.fn();

    const resolved = await resolvePlaceMapData(
      place("Abana", { latitude: 33.5, longitude: 36.3 }),
      { client: { getResource }, locations: fakeLocations() }
    );

    expect(getResource).not.toHaveBeenCalled();
    expect(resolved).toMatchObject({
      data: { geometry: { type: "Point", coordinates: [36.3, 33.5] } },
      attribution: [],
    });
  });

  it("falls back to the coordinates when the file fails to load", async () => {
    const getResource = vi.fn().mockRejectedValue(new Error("offline"));

    const resolved = await resolvePlaceMapData(
      place("Erech", { latitude: 31.3, longitude: 45.6 }),
      { client: { getResource }, locations: fakeLocations() }
    );

    expect(resolved).toMatchObject({
      data: { geometry: { type: "Point", coordinates: [45.6, 31.3] } },
      attribution: [],
    });
  });

  it("draws the coordinates without a known-places lookup", async () => {
    const getResource = vi.fn();

    const resolved = await resolvePlaceMapData(
      place("Erech", { latitude: 31.3, longitude: 45.6 }),
      { client: { getResource } }
    );

    expect(getResource).not.toHaveBeenCalled();
    expect(resolved?.data).toMatchObject({ geometry: { type: "Point" } });
  });

  it("answers null when the file fails and there are no coordinates", async () => {
    const getResource = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      resolvePlaceMapData(place("Erech"), {
        client: { getResource },
        locations: fakeLocations(),
      })
    ).resolves.toBeNull();
  });
});

describe("createIsPlaceOpen", () => {
  const BABEL = place("Babel", { latitude: 32.5365, longitude: 44.4209 });

  it("is never open without a pane manager", () => {
    expect(createIsPlaceOpen(undefined)(BABEL)).toBe(false);
  });

  it("follows the place's pane opening and closing", () => {
    const panes = createPanes();
    const isOpen = createIsPlaceOpen(panes);

    expect(isOpen(BABEL)).toBe(false);
    createOpenPlace(panes, readyMap(panes))?.(BABEL);
    expect(isOpen(BABEL)).toBe(true);
    panes.closePane(placePaneId(BABEL));
    expect(isOpen(BABEL)).toBe(false);
  });

  it("only counts that place's own pane", () => {
    const panes = createPanes();
    createOpenPlace(panes, readyMap(panes))?.(BABEL);

    expect(createIsPlaceOpen(panes)(place("Erech"))).toBe(false);
  });
});

describe("createOpenPlace", () => {
  function renderPane(panes: ReturnType<typeof createPanes>, id: string) {
    const pane = panes.panes.value.find((candidate) => candidate.id === id);
    const Content = pane!.component as () => ComponentChild;
    act(() => {
      render(<Content />, container);
    });
  }

  it("fills the floating pane with the place's map once its file loads", async () => {
    let answer: (value: unknown) => void = () => undefined;
    const getResource = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        })
    );
    const panes = createPanes();
    const erech = place("Erech");

    createOpenPlace(panes, readyMap(panes), {
      client: { getResource },
      locations: fakeLocations(),
    })?.(erech);
    renderPane(panes, placePaneId(erech));

    expect(container.querySelector(".sb-theographic-map-loading")).toBeTruthy();
    expect(container.querySelector(".leaflet-container")).toBeNull();

    answer({
      type: "Feature",
      geometry: { type: "Point", coordinates: ["31.3222", "45.6361"] },
      properties: { id: "Erech" },
    });
    await waitFor(
      () => container.querySelector(".sb-geojson-map-point") !== null
    );

    expect(container.querySelector(".sb-geojson-map-label")?.textContent).toBe(
      "Erech"
    );
    // Zoom 10's tile over Erech, in southern Iraq — only reached once the
    // hand-built file's latitude-first numbers have been flipped.
    const tile = container
      .querySelector("img.leaflet-tile")
      ?.getAttribute("src");
    expect(tile).toBe("https://tile.openstreetmap.org/10/641/418.png");
  });

  it("says so, rather than showing an empty pane, when nothing can be drawn", async () => {
    const panes = createPanes();
    const erech = place("Erech");

    createOpenPlace(panes, readyMap(panes), {
      client: { getResource: () => Promise.reject(new Error("offline")) },
      locations: fakeLocations(),
    })?.(erech);
    renderPane(panes, placePaneId(erech));
    await flush();
    await flush();

    expect(container.querySelector(".leaflet-container")).toBeNull();
    expect(container.textContent).toBe("This place can't be shown on the map.");
  });

  it("opens nothing for a place there is nothing to draw for", () => {
    const panes = createPanes();

    createOpenPlace(panes, readyMap(panes), { locations: fakeLocations() })?.(
      place("Abana")
    );

    expect(panes.panes.value).toHaveLength(0);
  });
});
