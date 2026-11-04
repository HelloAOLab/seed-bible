import { render } from "preact";
import { act } from "preact/test-utils";
import type { ComponentChild } from "preact";
import { signal } from "@preact/signals";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import {
  MAX_MAP_DATA_LENGTH,
  canMapPlace,
  createIsPlaceOpen,
  createOpenPlace,
  findKnownLocation,
  fitsInPortalUrl,
  placeMapId,
  resolvePlaceMapData,
  type PlaceLocations,
} from "@packages/theographic-extension/ext_theographic/map";
import type { TheographicPlaceEntry } from "@packages/theographic-extension/ext_theographic/provider";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

let container: HTMLDivElement;

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
  };
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

describe("fitsInPortalUrl", () => {
  it("measures the data as it will be encoded in the URL", () => {
    // Each space becomes "+" and each "é" six characters, so text well under
    // the limit can still be over it once encoded.
    const accented = "é".repeat(Math.ceil(MAX_MAP_DATA_LENGTH / 6) + 1);

    expect(fitsInPortalUrl("x".repeat(MAX_MAP_DATA_LENGTH))).toBe(true);
    expect(fitsInPortalUrl("x".repeat(MAX_MAP_DATA_LENGTH + 1))).toBe(false);
    expect(fitsInPortalUrl(accented)).toBe(false);
  });
});

describe("resolvePlaceMapData", () => {
  const geojson = { type: "FeatureCollection", features: [] };

  it("fetches a listed place's file, no longer than the map can take", async () => {
    const getResource = vi.fn().mockResolvedValue(geojson);

    await expect(
      resolvePlaceMapData(place("Jerusalem"), {
        client: { getResource },
        locations: fakeLocations(),
      })
    ).resolves.toBe(JSON.stringify(geojson));
    expect(getResource).toHaveBeenCalledWith(
      "https://files.test/m66c5b8.json",
      { maxLength: MAX_MAP_DATA_LENGTH }
    );
  });

  it("builds a point for an unlisted place without fetching anything", async () => {
    const getResource = vi.fn();

    const data = await resolvePlaceMapData(
      place("Abana", { latitude: 33.5, longitude: 36.3 }),
      { client: { getResource }, locations: fakeLocations() }
    );

    expect(getResource).not.toHaveBeenCalled();
    expect(JSON.parse(data!)).toMatchObject({
      geometry: { type: "Point", coordinates: [33.5, 36.3] },
    });
  });

  it("falls back to the coordinates when the file fails to load", async () => {
    const getResource = vi.fn().mockRejectedValue(new Error("offline"));

    const data = await resolvePlaceMapData(
      place("Erech", { latitude: 31.3, longitude: 45.6 }),
      { client: { getResource }, locations: fakeLocations() }
    );

    expect(JSON.parse(data!)).toMatchObject({
      geometry: { type: "Point", coordinates: [31.3, 45.6] },
    });
  });

  it("falls back to the coordinates when the file won't fit in the URL", async () => {
    // Short enough as text, too long once every "é" is percent-encoded.
    const accented = { name: "é".repeat(MAX_MAP_DATA_LENGTH / 2) };
    const getResource = vi.fn().mockResolvedValue(accented);

    const data = await resolvePlaceMapData(
      place("Erech", { latitude: 31.3, longitude: 45.6 }),
      { client: { getResource }, locations: fakeLocations() }
    );

    expect(JSON.parse(data!)).toMatchObject({ geometry: { type: "Point" } });
  });

  it("draws the coordinates without a known-places lookup", async () => {
    const getResource = vi.fn();

    const data = await resolvePlaceMapData(
      place("Erech", { latitude: 31.3, longitude: 45.6 }),
      { client: { getResource } }
    );

    expect(getResource).not.toHaveBeenCalled();
    expect(JSON.parse(data!)).toMatchObject({ geometry: { type: "Point" } });
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
    createOpenPlace(panes)?.(BABEL);
    expect(isOpen(BABEL)).toBe(true);
    panes.closePane(placeMapId(BABEL));
    expect(isOpen(BABEL)).toBe(false);
  });

  it("only counts that place's own pane", () => {
    const panes = createPanes();
    createOpenPlace(panes)?.(BABEL);

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

  it("fills the floating pane with the place's file once it loads", async () => {
    const geojson = { type: "FeatureCollection", features: [] };
    let answer: (value: unknown) => void = () => undefined;
    const getResource = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        })
    );
    const panes = createPanes();
    const erech = place("Erech");

    createOpenPlace(panes, {
      client: { getResource },
      locations: fakeLocations(),
    })?.(erech);
    renderPane(panes, placeMapId(erech));

    expect(container.querySelector(".sb-theographic-map-loading")).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();

    answer(geojson);
    await flush();
    await flush();

    const src = new URL(
      container.querySelector("iframe")!.getAttribute("src")!
    );
    expect(JSON.parse(src.searchParams.get("mapData")!)).toEqual(geojson);
  });

  it("says so, rather than showing an empty pane, when nothing can be drawn", async () => {
    const panes = createPanes();
    const erech = place("Erech");

    createOpenPlace(panes, {
      client: { getResource: () => Promise.reject(new Error("offline")) },
      locations: fakeLocations(),
    })?.(erech);
    renderPane(panes, placeMapId(erech));
    await flush();
    await flush();

    expect(container.querySelector("iframe")).toBeNull();
    expect(container.textContent).toBe("This place can't be shown on the map.");
  });

  it("opens nothing for a place there is nothing to draw for", () => {
    const panes = createPanes();

    createOpenPlace(panes, { locations: fakeLocations() })?.(place("Abana"));

    expect(panes.panes.value).toHaveLength(0);
  });

  describe("on a phone", () => {
    const BABEL = place("Babel", { latitude: 32.5365, longitude: 44.4209 });

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
      const openPlace = createOpenPlace(panes, {}, { isMobile, modals });
      return { isMobile, panes, modals, openPlace };
    }

    it("opens a sheet over Discover instead of a pane, so Discover stays as it was", () => {
      const { panes, modals, openPlace } = phoneWithDiscoverOpen();
      const discover = panes.panes.value[0];

      openPlace?.(BABEL);

      expect(modals.modals.value).toEqual([
        expect.objectContaining({
          id: placeMapId(BABEL),
          title: "Babel",
          mobileSheet: true,
        }),
      ]);
      // A pane would have closed Discover; the sheet leaves it untouched.
      expect(panes.panes.value).toEqual([discover]);
    });

    it("fills the sheet with the place's map", async () => {
      const { modals, openPlace } = phoneWithDiscoverOpen();
      openPlace?.(BABEL);

      const Content = () =>
        modals.modals.value[0]!.content({ t: (key) => key }) as ComponentChild;
      act(() => {
        render(<Content />, container);
      });
      await flush();
      await flush();

      const sheet = container.querySelector(".sb-theographic-map-sheet");
      expect(sheet?.querySelector("iframe")).not.toBeNull();
    });

    it("opens the floating pane once the screen is wider", () => {
      const { isMobile, panes, modals, openPlace } = phoneWithDiscoverOpen();
      isMobile.value = false;

      openPlace?.(BABEL);

      expect(modals.modals.value).toEqual([]);
      expect(panes.panes.value.map((pane) => pane.id)).toEqual([
        "discover-pane",
        placeMapId(BABEL),
      ]);
    });

    it("counts the place as open while its sheet is", () => {
      const { panes, modals, openPlace } = phoneWithDiscoverOpen();
      const isOpen = createIsPlaceOpen(panes, modals);

      openPlace?.(BABEL);
      expect(isOpen(BABEL)).toBe(true);
      expect(isOpen(place("Erech"))).toBe(false);

      modals.dismissModal(placeMapId(BABEL));
      expect(isOpen(BABEL)).toBe(false);
    });
  });
});
