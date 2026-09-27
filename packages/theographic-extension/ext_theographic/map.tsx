import { useSignal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { MaterialIcon, PortalComponent, Skeleton } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import geoImporterPattern from "virtual:@pattern/geo-importer";
import { v4 as uuid } from "uuid";
import type {
  LocationsExtensionApi,
  PlaceData,
} from "@seed-bible/locations-extension";
import type { PanesManager } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { withoutQualifier } from "./names";
import type { TheographicClient, TheographicPlaceEntry } from "./provider";

/**
 * A place as a GeoJSON point, ready to hand to the geo-importer map.
 *
 * A bare `Feature` rather than a `FeatureCollection` on purpose: the importer
 * labels and focuses the map on a lone `Feature`, while a collection is drawn
 * without either unless it also carries `metadata.name` and a `bbox`.
 */
export interface PlaceGeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    /**
     * Latitude first, then longitude — deliberately *not* GeoJSON's documented
     * `[longitude, latitude]` order.
     *
     * For a lone Feature the importer places its label, and focuses the
     * camera, with `coordinates[1]` as X (longitude) and `coordinates[0]` as
     * Y (see `parseFeature` in `loadMap.tsx`). Confirmed by opening a place
     * and seeing where the map lands. The locations extension's hand-built
     * files use this order too; OpenBible's are in spec order and focus from
     * their `bbox` instead, so they are passed through untouched.
     */
    coordinates: [number, number];
  };
  properties: {
    /**
     * Required by the importer's schema, and what it draws as the map label —
     * so this is the readable name ("Egypt"), not the dataset's slug
     * ("egypt_362").
     */
    id: string;
    name: string;
    featureType?: string;
  };
}

/**
 * Turns a place's coordinates into a GeoJSON point.
 *
 * Null when the dataset has no position for it — about 20 of its 1,274 places,
 * which callers use to decide there is nothing to show on a map.
 */
export function placeToGeoJson(
  place: TheographicPlaceEntry
): PlaceGeoJsonFeature | null {
  const { latitude, longitude } = place;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [latitude, longitude],
    },
    properties: {
      id: place.name,
      name: place.name,
      ...(place.featureType ? { featureType: place.featureType } : {}),
    },
  };
}

/** The id a place's floating map pane is opened under, one per place. */
export function placePaneId(place: Pick<TheographicPlaceEntry, "id">): string {
  return `theographic-place-${place.id}`;
}

/**
 * Whether a place's map is currently open in its floating pane.
 *
 * Reads the pane list itself rather than tracking open/close here, so it stays
 * right however the pane goes away — its close button, being displaced, or
 * closed from code. Read during render, it re-renders the reader when that
 * changes.
 */
export function createIsPlaceOpen(
  panes: PanesManager | undefined
): (place: TheographicPlaceEntry) => boolean {
  if (!panes) {
    return () => false;
  }
  return (place) => {
    const id = placePaneId(place);
    return panes.panes.value.some((pane) => pane.id === id);
  };
}

/** The part of the locations extension's API the map uses. */
export type PlaceLocations = Pick<
  LocationsExtensionApi,
  "findLocation" | "getPlaceGeoJsonUrl"
>;

/** Where a place's map data comes from, besides its own coordinates. */
export interface PlaceMapSources {
  /** Fetches, and caches, the locations extension's file. */
  client?: Pick<TheographicClient, "getResource">;
  /** The locations extension's lookup. Without it, only coordinates are drawn. */
  locations?: PlaceLocations;
}

/**
 * The locations extension's entry for a place, or null when it has none.
 *
 * Theographic adds a trailing qualifier to tell same-named places apart
 * ("Bethel (of Palestine)"), which the extension's file doesn't use, so the
 * name is tried as given and then without it.
 */
export function findKnownLocation(
  name: string,
  locations: PlaceLocations | undefined
): PlaceData | null {
  if (!locations) {
    return null;
  }
  return (
    locations.findLocation(name) ??
    locations.findLocation(withoutQualifier(name))
  );
}

/** Whether there is anything to draw for a place: a known file or coordinates. */
export function canMapPlace(
  place: TheographicPlaceEntry,
  locations: PlaceLocations | undefined
): boolean {
  return (
    findKnownLocation(place.name, locations) !== null ||
    placeToGeoJson(place) !== null
  );
}

/**
 * The longest `mapData` the portal can be handed, in URL-encoded characters.
 *
 * The data travels in the ao.bot iframe's URL, and ao.bot's server drops any
 * request past about 16,200 characters (measured September 2026). The rest of
 * the URL and the browser's headers need some of that, hence the margin.
 * Most places' files are a few hundred characters; the few past this — Crete
 * is 1.35 MB encoded — are drawn from their coordinates instead.
 */
export const MAX_MAP_DATA_LENGTH = 12_000;

/** Whether `mapData` fits in the portal's URL. */
export function fitsInPortalUrl(mapData: string): boolean {
  const prefix = "mapData=".length;
  return (
    new URLSearchParams({ mapData }).toString().length - prefix <=
    MAX_MAP_DATA_LENGTH
  );
}

/**
 * The `mapData` to hand the geo-importer for a place, as the JSON text it
 * expects.
 *
 * The locations extension's file when it has one that fits in the portal's
 * URL — an outline or a curated point, rather than the single coordinate the
 * dataset carries — and a point built from the coordinates otherwise, or when
 * that file can't be fetched. Null when there is nothing to draw at all.
 */
export async function resolvePlaceMapData(
  place: TheographicPlaceEntry,
  sources: PlaceMapSources
): Promise<string | null> {
  const { client, locations } = sources;
  const known = findKnownLocation(place.name, locations);
  if (known && client && locations) {
    try {
      // Nothing longer can fit once encoded, so there's no use keeping it.
      const geojson = await client.getResource<unknown>(
        locations.getPlaceGeoJsonUrl(known),
        { maxLength: MAX_MAP_DATA_LENGTH }
      );
      const mapData = JSON.stringify(geojson);
      if (fitsInPortalUrl(mapData)) {
        return mapData;
      }
    } catch {
      // Fall through to the coordinates.
    }
  }

  const point = placeToGeoJson(place);
  return point ? JSON.stringify(point) : null;
}

type MapDataState = string | null | "loading";

/**
 * Loads a place's map data, again whenever the place changes.
 *
 * `key` stands in for `load` as the dependency: callers pass a fresh closure
 * every render, which would otherwise reload on each one.
 */
function useMapData(
  key: string,
  load: () => Promise<string | null>
): MapDataState {
  const mapData = useSignal<MapDataState>("loading");

  useEffect(() => {
    let isCurrent = true;
    mapData.value = "loading";
    void load().then((loaded) => {
      if (isCurrent) {
        mapData.value = loaded;
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [key]);

  return mapData.value;
}

/**
 * The geo-importer portal, or a placeholder while its data loads.
 *
 * PortalComponent builds its iframe URL once, on mount, so it can only be
 * mounted once `mapData` is in hand.
 */
function PlaceMapPortal(props: { mapData: string | "loading"; inst: string }) {
  if (props.mapData === "loading") {
    return (
      <Skeleton
        shape="block"
        width="100%"
        height="100%"
        className="sb-theographic-map-loading"
      />
    );
  }
  return (
    <PortalComponent
      portal="map"
      portalType="map"
      pattern={geoImporterPattern}
      inst={props.inst}
      query={{ mapData: props.mapData }}
    />
  );
}

/** A place's map filling its floating pane. */
function PlacePane(props: {
  place: TheographicPlaceEntry;
  sources: PlaceMapSources;
  inst: string;
}) {
  const { place, sources, inst } = props;
  const { t } = useI18n("theographic-extension");
  const mapData = useMapData(place.id, () =>
    resolvePlaceMapData(place, sources)
  );

  if (mapData === null) {
    return (
      <p className="sb-theographic-card-hint">
        {t("map-unavailable", {
          defaultValue: "This place can't be shown on the map.",
        })}
      </p>
    );
  }
  return <PlaceMapPortal mapData={mapData} inst={inst} />;
}

/**
 * Opens a place on the geo-importer map, in its own floating pane.
 *
 * Undefined without a `PanesManager`, which is how the card decides whether
 * to offer the control at all.
 */
export function createOpenPlace(
  panes: PanesManager | undefined,
  sources: PlaceMapSources = {}
): ((place: TheographicPlaceEntry) => void) | undefined {
  if (!panes) {
    return undefined;
  }

  return (place) => {
    if (!canMapPlace(place, sources.locations)) {
      return;
    }

    // The portal instance id is generated once, here — not inside the pane's
    // render function — so re-renders (dragging or resizing the pane) reuse
    // the same `inst` and the map iframe keeps its document instead of
    // reloading.
    const inst = uuid();

    panes.openPane({
      id: placePaneId(place),
      placement: "floating",
      title: place.name,
      component: () => (
        <PlacePane place={place} sources={sources} inst={inst} />
      ),
    });
  };
}

/** "33.0920, 44.1292" — the position shown on the inline map. */
export function formatCoordinates(
  latitude?: number,
  longitude?: number
): string | null {
  if (latitude == null || longitude == null) {
    return null;
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * A place drawn on the CasualOS map, inline in its card.
 *
 * The same geo-importer portal the floating pane uses, sized to sit in the
 * card. Renders nothing for a place there turns out to be nothing to draw for.
 */
export function PlaceMap(props: {
  place: TheographicPlaceEntry;
  label: string;
  sources: PlaceMapSources;
  /** Opens this map in its own pane. Omit and no control is shown. */
  onOpen?: () => void;
  /** The control's accessible name, already translated. */
  openLabel?: string;
}) {
  const { place, label, sources, onOpen, openLabel } = props;
  // One portal instance per place shown. PortalComponent builds its iframe
  // URL once on mount, so this only has to stay stable, not memoise `query`.
  const inst = useMemo(() => uuid(), [place.id]);
  const mapData = useMapData(place.id, () =>
    resolvePlaceMapData(place, sources)
  );

  if (mapData === null) {
    return null;
  }

  const coordinates = formatCoordinates(place.latitude, place.longitude);

  return (
    // A group rather than an image: it holds a real control as well.
    <div className="sb-theographic-map" role="group" aria-label={label}>
      <PlaceMapPortal key={inst} mapData={mapData} inst={inst} />
      {coordinates ? (
        <span className="sb-theographic-map-coords">{coordinates}</span>
      ) : null}
      {onOpen ? (
        <button
          type="button"
          className="sb-theographic-map-open"
          title={openLabel}
          aria-label={openLabel}
          onClick={onOpen}
        >
          <MaterialIcon>float_landscape_2</MaterialIcon>
        </button>
      ) : null}
    </div>
  );
}
