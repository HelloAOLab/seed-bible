import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import type { ComponentChild } from "preact";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import {
  createMapManager,
  type LeafletModule,
} from "@packages/seed-bible/seed-bible/managers/MapManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { ManagedBibleVerseToolbarTool } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { waitFor } from "../seed-bible/testUtils/createTestSeedBibleState";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const { default: initLocationsExtension, loadPlaceGeoJson } =
  await import("@packages/locations-extension/ext_locations/init");

const ACCO = { place: "Acco", geojson: "Acco" };
const JERUSALEM = { place: "Jerusalem", geojson: "m66c5b8" };

// Acco's file exactly as the isreal_geojson repo serves it.
const ACCO_FILE = {
  geometry: {
    coordinates: ["32.921300000000002", "35.087499999999999"],
    type: "Point",
  },
  properties: { id: "Acco" },
  type: "Feature",
};

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
  unregisterExtension("ext_locations");
  vi.unstubAllGlobals();
});

function stubFetch(answer: (url: string) => Response) {
  const fetch = vi.fn((url: string) => Promise.resolve(answer(url)));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("loadPlaceGeoJson", () => {
  it("fetches a hand-built place and puts it in standard order", async () => {
    const fetch = stubFetch(() => Response.json(ACCO_FILE));

    await expect(loadPlaceGeoJson(ACCO)).resolves.toMatchObject({
      geometry: {
        type: "Point",
        coordinates: [35.087499999999999, 32.921300000000002],
      },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/Acco.geojson"
    );
  });

  it("leaves an OpenBible file as it is", async () => {
    const file = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [35.234167, 31.776667] },
      properties: {},
    };
    stubFetch(() => Response.json(file));

    await expect(loadPlaceGeoJson(JERUSALEM)).resolves.toEqual(file);
  });

  it("rejects when the file can't be fetched", async () => {
    stubFetch(() => new Response("Not found", { status: 404 }));

    await expect(loadPlaceGeoJson(ACCO)).rejects.toThrow("Status: 404");
  });
});

describe("initLocationsExtension", () => {
  /** Installs the extension with a verse naming `text` selected. */
  function install(text: string) {
    const panes = createPanes();
    const map = createMapManager({
      panes,
      importLeaflet: () => Promise.resolve(leaflet),
    });
    let tool: ManagedBibleVerseToolbarTool | undefined;
    const selectedVerses = signal([{ verse: { number: 1, content: [text] } }]);
    const context = {
      app: {
        currentReadingState: signal({
          tab: { readingState: { selectedVerses } },
        }),
      },
      tools: {
        registerVerseToolbarTool: (
          registered: ManagedBibleVerseToolbarTool
        ) => {
          tool = registered;
          return () => undefined;
        },
      },
      map,
    } as unknown as SeedBibleState;

    setupExtensionContext(context);
    initLocationsExtension();
    return { panes, tool: () => tool! };
  }

  it("shows a place named in the selected verse on the map", async () => {
    stubFetch(() => Response.json(ACCO_FILE));
    const { panes, tool } = install("Paul came to Acco.");

    const items = tool().getItems?.({} as never) ?? [];
    expect(items.map((item) => item.id)).toEqual(["show-location-Acco"]);
    await act(async () => items[0]!.onSelect?.({} as never));

    const pane = panes.panes.value.find((p) => p.id === "location-Acco");
    expect(pane).toMatchObject({ title: "Acco", placement: "floating" });

    const Content = pane!.component as () => ComponentChild;
    act(() => {
      render(<Content />, container);
    });
    await waitFor(
      () => container.querySelector(".sb-geojson-map-point") !== null
    );

    // Zoom 10's tile over Acco, on the coast north of Haifa.
    expect(
      container.querySelector("img.leaflet-tile")?.getAttribute("src")
    ).toBe("https://tile.openstreetmap.org/10/611/412.png");
    expect(container.querySelector(".sb-geojson-map-label")?.textContent).toBe(
      "Acco"
    );
  });

  it("credits OpenBible on its places' maps", async () => {
    stubFetch(() =>
      Response.json({
        type: "Feature",
        geometry: { type: "Point", coordinates: [35.234167, 31.776667] },
        properties: {},
      })
    );
    const { panes, tool } = install("They went up to Jerusalem.");

    await act(async () =>
      tool()
        .getItems?.({} as never)[0]!
        .onSelect?.({} as never)
    );
    const Content = panes.panes.value[0]!.component as () => ComponentChild;
    act(() => {
      render(<Content />, container);
    });
    await waitFor(
      () => container.querySelector(".sb-geojson-map-point") !== null
    );

    const credits = container.querySelector(
      ".leaflet-control-attribution"
    )?.textContent;
    expect(credits).toContain("OpenStreetMap");
    expect(credits).toContain("OpenBible.info");
  });
});
