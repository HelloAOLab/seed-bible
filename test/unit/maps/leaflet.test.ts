import {
  createLeafletLoader,
  leafletLoader,
  MAP_TILE_SOURCE,
  type LeafletModule,
} from "@packages/maps";

let leaflet: LeafletModule;

beforeAll(async () => {
  // The real download, once; the tests below hand this copy back instantly.
  leaflet = await leafletLoader.load();
}, 30_000);

/** A download of Leaflet that only finishes when told to. */
function deferredLeaflet() {
  let finish: (succeeded: boolean) => void = () => undefined;
  const download = vi.fn(
    () =>
      new Promise<LeafletModule>((resolve, reject) => {
        finish = (succeeded) =>
          succeeded ? resolve(leaflet) : reject(new Error("offline"));
      })
  );
  return { download, finish: (succeeded = true) => finish(succeeded) };
}

describe("the Leaflet loader", () => {
  it("downloads the real library on demand", () => {
    expect(typeof leaflet.map).toBe("function");
    expect(typeof leaflet.geoJSON).toBe("function");
    expect(leafletLoader.status.value).toBe("ready");
  });

  it("downloads once, however many maps ask for it", async () => {
    const { download, finish } = deferredLeaflet();
    const loader = createLeafletLoader(download);

    expect(loader.status.value).toBe("idle");
    const first = loader.load();
    const second = loader.load();
    expect(loader.status.value).toBe("loading");

    finish();
    await expect(first).resolves.toBe(leaflet);
    await expect(second).resolves.toBe(leaflet);
    await loader.load();

    expect(download).toHaveBeenCalledTimes(1);
    expect(loader.status.value).toBe("ready");
    expect(loader.leaflet.value).toBe(leaflet);
  });

  it("tries again after a failed download", async () => {
    const download = vi
      .fn<() => Promise<LeafletModule>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(leaflet);
    const loader = createLeafletLoader(download);

    await expect(loader.load()).rejects.toThrow("offline");
    expect(loader.status.value).toBe("failed");
    expect(loader.leaflet.value).toBeNull();

    await expect(loader.load()).resolves.toBe(leaflet);
    expect(loader.status.value).toBe("ready");
    expect(download).toHaveBeenCalledTimes(2);
  });
});

it("keeps the base map's source and credit in one place", () => {
  expect(MAP_TILE_SOURCE.url).toBe(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  );
  expect(MAP_TILE_SOURCE.attribution).toContain("OpenStreetMap");
});
