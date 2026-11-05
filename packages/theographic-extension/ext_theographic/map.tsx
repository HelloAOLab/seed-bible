import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Feature, Point } from "geojson";
import { MaterialIcon, Skeleton } from "seed-bible/components";
import type {
  findLocation,
  getPlaceAttribution,
  getPlaceGeoJsonUrl,
  PlaceData,
  toMapGeoJson,
} from "@seed-bible/bible-locations";
import {
  GeoJsonMap,
  isMapOpen,
  openMap,
  type MapData,
  type MapHost,
} from "@seed-bible/maps";
import { withoutQualifier } from "./names";
import type { TheographicClient, TheographicPlaceEntry } from "./provider";

/** The credit the Theographic dataset's own coordinates need on a map. */
export const THEOGRAPHIC_ATTRIBUTION =
  'Places: <a href="https://github.com/robertrouse/theographic-bible-metadata" target="_blank" rel="noopener noreferrer">Theographic Bible Metadata</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>)';

/** A place as a GeoJSON point, `[longitude, latitude]` like all GeoJSON. */
export type PlaceGeoJsonFeature = Feature<
  Point,
  { id: string; name: string; featureType?: string }
>;

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
      coordinates: [longitude, latitude],
    },
    properties: {
      id: place.name,
      name: place.name,
      ...(place.featureType ? { featureType: place.featureType } : {}),
    },
  };
}

/** The id a place's map pane or sheet is opened under, one per place. */
export function placeMapId(place: Pick<TheographicPlaceEntry, "id">): string {
  return `theographic-place-${place.id}`;
}

/**
 * Whether a place's map is currently open in its floating pane, or on a
 * phone, its sheet. Read during render, it re-renders the reader when that
 * changes.
 */
export function createIsPlaceOpen(
  host: MapHost | undefined
): (place: TheographicPlaceEntry) => boolean {
  if (!host) {
    return () => false;
  }
  return (place) => isMapOpen(host, placeMapId(place));
}

/** The place lookup the map uses: `@seed-bible/bible-locations`, or a stand-in. */
export interface PlaceLocations {
  findLocation: typeof findLocation;
  getPlaceGeoJsonUrl: typeof getPlaceGeoJsonUrl;
  toMapGeoJson: typeof toMapGeoJson;
  getPlaceAttribution: typeof getPlaceAttribution;
}

/** Where a place's map data comes from, besides its own coordinates. */
export interface PlaceMapSources {
  /** Fetches, and caches, a place's GeoJSON file. */
  client?: Pick<TheographicClient, "getResource">;
  /** The known places' lookup. Without it, only coordinates are drawn. */
  locations?: PlaceLocations;
}

/**
 * The known-places entry for a place, or null when it has none.
 *
 * Theographic adds a trailing qualifier to tell same-named places apart
 * ("Bethel (of Palestine)"), which the known-places file doesn't use, so the
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
 * What to draw for a place.
 *
 * The known place's file when it has one — an outline or a curated point,
 * rather than the single coordinate the dataset carries — and a point built
 * from the coordinates otherwise, or when that file can't be fetched. Null
 * when there is nothing to draw at all.
 */
export async function resolvePlaceMapData(
  place: TheographicPlaceEntry,
  sources: PlaceMapSources
): Promise<MapData | null> {
  const { client, locations } = sources;
  const known = findKnownLocation(place.name, locations);
  if (known && client && locations) {
    try {
      const geojson = await client.getResource<unknown>(
        locations.getPlaceGeoJsonUrl(known)
      );
      return {
        data: locations.toMapGeoJson(known, geojson),
        attribution: locations.getPlaceAttribution(known),
      };
    } catch {
      // Fall through to the coordinates.
    }
  }

  const point = placeToGeoJson(place);
  return point ? { data: point, attribution: [THEOGRAPHIC_ATTRIBUTION] } : null;
}

type MapDataState = MapData | null | "loading";

/**
 * Loads a place's map data, again whenever the place changes.
 *
 * `key` stands in for `load` as the dependency: callers pass a fresh closure
 * every render, which would otherwise reload on each one.
 */
function useMapData(
  key: string,
  load: () => Promise<MapData | null>
): MapDataState {
  const mapData = useSignal<MapDataState>("loading");

  useEffect(() => {
    let isCurrent = true;
    mapData.value = "loading";
    load().then(
      (loaded) => {
        if (isCurrent) {
          mapData.value = loaded;
        }
      },
      (error: unknown) => {
        console.error("Failed to load map data for", key, error);
        if (isCurrent) {
          mapData.value = null;
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [key]);

  return mapData.value;
}

/**
 * Opens a place's map in its own floating pane, or on a phone, a sheet.
 *
 * Undefined without anywhere to open it, which is how the card decides
 * whether to offer the control at all.
 */
export function createOpenPlace(
  host: MapHost | undefined,
  sources: PlaceMapSources = {}
): ((place: TheographicPlaceEntry) => void) | undefined {
  if (!host) {
    return undefined;
  }

  return (place) => {
    if (!canMapPlace(place, sources.locations)) {
      return;
    }
    openMap(host, {
      id: placeMapId(place),
      title: place.name,
      label: place.name,
      load: () => resolvePlaceMapData(place, sources),
    });
  };
}

/**
 * A place's map, inline in its card.
 *
 * The same map the floating pane draws, sized to sit in the card. Renders
 * nothing for a place there turns out to be nothing to draw for, where the
 * pane says so instead.
 */
export function PlaceMap(props: {
  place: TheographicPlaceEntry;
  label: string;
  sources: PlaceMapSources;
  /**
   * Opens this map in its own pane or sheet: from its corner control, or on
   * a phone, a tap on the map. Omit and neither is offered.
   */
  onOpen?: () => void;
  /** The control's accessible name, already translated. */
  openLabel?: string;
}) {
  const { place, label, sources, onOpen, openLabel } = props;
  const mapData = useMapData(place.id, () =>
    resolvePlaceMapData(place, sources)
  );

  if (mapData === null) {
    return null;
  }

  return (
    // A group rather than an image: it holds a real control as well.
    <div className="sb-theographic-map" role="group" aria-label={label}>
      {mapData === "loading" ? (
        <Skeleton
          shape="block"
          width="100%"
          height="100%"
          className="sb-theographic-map-loading"
        />
      ) : (
        <GeoJsonMap
          data={mapData.data}
          // The card credits the dataset just below the map; the floating
          // pane has no card, so it keeps the credit.
          attribution={(mapData.attribution ?? []).filter(
            (credit) => credit !== THEOGRAPHIC_ATTRIBUTION
          )}
          label={place.name}
          inline
          onTap={onOpen}
          controls={
            onOpen ? (
              <button
                type="button"
                className="sb-geojson-map-control sb-theographic-map-open"
                title={openLabel}
                aria-label={openLabel}
                onClick={onOpen}
              >
                <MaterialIcon>float_landscape_2</MaterialIcon>
              </button>
            ) : null
          }
        />
      )}
    </div>
  );
}
