import { signal, useSignal, type ReadonlySignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type * as Leaflet from "leaflet";
import type { Feature, GeoJsonObject, Point } from "geojson";
import { useI18n } from "../i18n/I18nManager";
import { GeoJsonMap } from "../components/GeoJsonMap/GeoJsonMap";
import { Skeleton } from "../components/Skeleton/Skeleton";
import type { Pane, PaneTitle, PanesManager } from "./PanesManager";

export type { Feature, GeoJsonObject, Point };
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
 * The base map every map in the app draws on. Switching providers (another
 * tile server, satellite imagery, a self-hosted file) is a change here alone.
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
 * its own that the startup bundle never includes: Locations loads with the
 * app to find places in each chapter, and a static import anywhere on that
 * path would send the map library to every visitor.
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

export interface OpenMapOptions {
  /** Reopening with the same id replaces that pane rather than adding one. */
  id?: string;
  title: PaneTitle;
  /** The place's name, labelled on the map and used as its accessible name. */
  label: string;
  /** Fetches what to draw. Null, or a rejection, shows that there's nothing to. */
  load: () => Promise<GeoJsonObject | null>;
  /** Credits for the place data, as HTML, shown beside the base map's. */
  attribution?: string[];
}

export interface MapManagerOptions {
  panes: PanesManager;
  tileSource?: MapTileSource;
  /** Replaces the download of Leaflet itself. For tests. */
  importLeaflet?: () => Promise<LeafletModule>;
}

export function createMapManager(options: MapManagerOptions) {
  const { panes, tileSource = MAP_TILE_SOURCE } = options;
  const load = options.importLeaflet ?? importLeaflet;

  const leaflet = signal<LeafletModule | null>(null);
  const status = signal<LeafletStatus>("idle");
  let pending: Promise<LeafletModule> | null = null;

  /**
   * Leaflet, downloading it the first time. Every later call shares that one
   * download; a failed one is forgotten so the next call can try again.
   */
  const loadLeaflet = (): Promise<LeafletModule> => {
    if (!pending) {
      status.value = "loading";
      pending = load().then(
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

  const manager = {
    tileSource,
    /** Leaflet once it has downloaded, else null. */
    leaflet: leaflet as ReadonlySignal<LeafletModule | null>,
    status: status as ReadonlySignal<LeafletStatus>,
    loadLeaflet,
    /** Opens a place's map in a floating pane, loading its data there. */
    openMap: (open: OpenMapOptions): Pane => {
      // Starts Leaflet's download alongside the place data rather than after.
      void loadLeaflet().catch(() => undefined);
      return panes.openPane({
        id: open.id,
        placement: "floating",
        title: open.title,
        component: () => <MapPane map={manager} options={open} />,
      });
    },
  };
  return manager;
}

export type MapManager = ReturnType<typeof createMapManager>;

type PaneData =
  | { status: "loading" }
  | { status: "loaded"; data: GeoJsonObject }
  | { status: "empty" };

function MapPane(props: { map: MapManager; options: OpenMapOptions }) {
  const { map, options } = props;
  const { t } = useI18n();
  const state = useSignal<PaneData>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    options.load().then(
      (data) => {
        if (isCurrent) {
          state.value = data ? { status: "loaded", data } : { status: "empty" };
        }
      },
      (error: unknown) => {
        console.error("Failed to load map data for", options.label, error);
        if (isCurrent) {
          state.value = { status: "empty" };
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [options]);

  const current = state.value;
  if (current.status === "loading") {
    return <Skeleton shape="block" width="100%" height="100%" radius="0" />;
  }
  if (current.status === "empty") {
    return (
      <p className="sb-geojson-map-message">
        {t("map-place-unavailable", {
          defaultValue: "This place can't be shown on the map.",
        })}
      </p>
    );
  }
  return (
    <GeoJsonMap
      map={map}
      data={current.data}
      label={options.label}
      attribution={options.attribution}
    />
  );
}
