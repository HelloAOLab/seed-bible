import { signal, type ReadonlySignal } from "@preact/signals";
import type * as Leaflet from "leaflet";

export type LeafletModule = typeof Leaflet;

/** Where a map's base imagery comes from, and the credit it requires. */
export interface MapTileSource {
  /** Leaflet tile URL template, with `{z}`, `{x}` and `{y}`. */
  url: string;
  /** HTML shown in the map's corner. Required by every tile provider's terms. */
  attribution: string;
  maxZoom: number;
}

/**
 * The base map every map draws on. Switching providers (another tile server,
 * satellite imagery, a self-hosted file) is a change here alone.
 *
 * OpenStreetMap's public server is free under its tile usage policy
 * (operations.osmfoundation.org/policies/tiles): the credit must show, and
 * tiles may only be loaded as they come on screen — Leaflet's normal behavior
 * — never pre-fetched or bulk-downloaded for offline use.
 */
export const MAP_TILE_SOURCE: MapTileSource = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
};

export type LeafletStatus = "idle" | "loading" | "ready" | "failed";

/**
 * Downloads Leaflet and its stylesheet.
 *
 * Only ever reached through `import()`, so the bundler gives Leaflet a file of
 * its own: an extension that maps places loads with the app to list each
 * chapter's places, and a static import anywhere on that path would send the
 * map library to every visitor who has it installed.
 */
async function importLeaflet(): Promise<LeafletModule> {
  const [module] = await Promise.all([
    import("leaflet"),
    import("leaflet/dist/leaflet.css"),
  ]);
  // Leaflet 1.x ships as UMD, so depending on the bundler the library is
  // either the namespace itself or its `default`.
  const withDefault = module as LeafletModule & { default?: LeafletModule };
  return withDefault.default ?? withDefault;
}

/**
 * Leaflet, downloaded the first time a map asks for it.
 *
 * `download` replaces the real download. For tests; the app shares
 * {@link leafletLoader}.
 */
export function createLeafletLoader(
  download: () => Promise<LeafletModule> = importLeaflet
) {
  const leaflet = signal<LeafletModule | null>(null);
  const status = signal<LeafletStatus>("idle");
  let pending: Promise<LeafletModule> | null = null;

  /**
   * Every call shares the one download; a failed one is forgotten so the next
   * call can try again.
   */
  const load = (): Promise<LeafletModule> => {
    if (!pending) {
      status.value = "loading";
      pending = download().then(
        (module) => {
          leaflet.value = module;
          status.value = "ready";
          return module;
        },
        (error: unknown) => {
          pending = null;
          status.value = "failed";
          throw error;
        }
      );
    }
    return pending;
  };

  return {
    /** Leaflet once it has downloaded, else null. */
    leaflet: leaflet as ReadonlySignal<LeafletModule | null>,
    status: status as ReadonlySignal<LeafletStatus>,
    load,
  };
}

export type LeafletLoader = ReturnType<typeof createLeafletLoader>;

/** The page's one copy of Leaflet, shared by every map on it. */
export const leafletLoader = createLeafletLoader();
