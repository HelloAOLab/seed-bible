import "./GeoJsonMap.css";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Map as LeafletMap } from "leaflet";
import { useI18n } from "../../i18n/I18nManager";
import type {
  GeoJsonObject,
  LeafletModule,
  MapManager,
  MapTileSource,
} from "../../managers/MapManager";
import { Skeleton } from "../Skeleton/Skeleton";
import { MaterialIcon } from "../icons";

/** How far in a lone point is shown: a town and the country around it. */
export const POINT_ZOOM = 10;

/** Where the map rests when the data holds nothing it can place. */
const DEFAULT_VIEW = { center: [31.5, 35] as [number, number], zoom: 6 };

const POINT_TYPES = new Set(["Point", "MultiPoint"]);

interface DrawOptions {
  tileSource: MapTileSource;
  data: GeoJsonObject;
  label?: string;
  attribution?: readonly string[];
  inline: boolean;
}

function hasArea(size: { x: number; y: number }): boolean {
  return size.x > 0 && size.y > 0;
}

interface DrawnMap {
  map: LeafletMap;
  /** Moves the view back to the data, as it was first shown. */
  fit: () => void;
}

/**
 * Builds the Leaflet map in `container`. Throws for data Leaflet can't read.
 *
 * Points are circles rather than Leaflet's default pin: the pin is an image
 * Leaflet finds by guessing its own script's URL, which a bundled build breaks.
 */
function drawMap(
  L: LeafletModule,
  container: HTMLElement,
  options: DrawOptions
): DrawnMap {
  const { tileSource, data, label, attribution = [], inline } = options;
  const map = L.map(container, {
    // An inline map sits in scrolling content: the wheel, or a finger on a
    // phone, should scroll past it, not get caught panning it.
    scrollWheelZoom: !inline,
    dragging: !(inline && L.Browser.mobile),
  });

  try {
    L.tileLayer(tileSource.url, {
      attribution: tileSource.attribution,
      maxZoom: tileSource.maxZoom,
    }).addTo(map);
    // Drops Leaflet's own "Leaflet" link, leaving just the credits the base
    // map and data require.
    map.attributionControl.setPrefix(false);
    for (const credit of attribution) {
      map.attributionControl.addAttribution(credit);
    }

    const layer = L.geoJSON(data, {
      // Applied to the point circles too, overriding any class they're made with.
      style: (feature) => ({
        className: POINT_TYPES.has(feature?.geometry?.type ?? "")
          ? "sb-geojson-map-point"
          : "sb-geojson-map-shape",
      }),
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 7 }),
    }).addTo(map);

    const bounds = layer.getBounds();
    // Fits to the data's bounds rather than restoring a saved view: the
    // container may have been resized since, which changes the zoom needed.
    const fit = () => {
      if (!bounds.isValid()) {
        map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
      } else if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
        map.setView(bounds.getCenter(), POINT_ZOOM);
      } else {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: POINT_ZOOM });
      }
    };
    fit();

    if (label && bounds.isValid()) {
      // An element, not a string: Leaflet would read a string as HTML.
      const text = document.createElement("span");
      text.textContent = label;
      map.openTooltip(text, bounds.getCenter(), {
        permanent: true,
        direction: "top",
        offset: [0, -8],
        className: "sb-geojson-map-label",
      });
    }
    return { map, fit };
  } catch (error) {
    map.remove();
    throw error;
  }
}

/**
 * GeoJSON drawn over the app's base map, with Leaflet.
 *
 * Fills its parent. Leaflet downloads the first time any map shows (a
 * placeholder holds its space meanwhile); after that maps open at once.
 */
export function GeoJsonMap(props: {
  map: MapManager;
  /** In standard `[longitude, latitude]` order. */
  data: GeoJsonObject;
  /**
   * The place's name, labelled on the map. A full map also takes it as its
   * accessible name; an inline one leaves naming to what it sits in.
   */
  label?: string;
  /** Credits for the data, as HTML, shown beside the base map's. */
  attribution?: readonly string[];
  /**
   * For a map sitting in scrolling content, such as a card: scrolling and
   * swiping pass over it instead of moving the map.
   */
  inline?: boolean;
  /** Buttons for the map's top corner, stacked above its recenter button. */
  controls?: ComponentChildren;
  className?: string;
}) {
  const {
    map,
    data,
    label,
    attribution,
    inline = false,
    controls,
    className,
  } = props;
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const isInvalid = useSignal(false);
  /** Re-fits the drawn map to its data; null until a map is drawn. */
  const recenter = useSignal<(() => void) | null>(null);
  const L = map.leaflet.value;
  const status = map.status.value;

  useEffect(() => {
    void map.loadLeaflet().catch(() => undefined);
  }, [map]);

  // Joined so a caller passing a fresh array each render doesn't redraw.
  const credits = attribution?.join("\n") ?? "";

  useEffect(() => {
    const element = container.current;
    if (!L || !element) {
      return;
    }

    let drawn: DrawnMap;
    try {
      drawn = drawMap(L, element, {
        tileSource: map.tileSource,
        data,
        label,
        attribution: credits ? credits.split("\n") : [],
        inline,
      });
      isInvalid.value = false;
      recenter.value = drawn.fit;
    } catch (error) {
      console.error("Failed to draw map data", error);
      isInvalid.value = true;
      return;
    }

    // Leaflet measures its container once; floating panes resize freely. A map
    // drawn before its box had a size couldn't fit its data, and Leaflet falls
    // back to the closest zoom allowed, far too close for a region or island,
    // so the first real size re-fits it. The reader can't have moved a map
    // they couldn't see yet.
    let hasSize = hasArea(drawn.map.getSize());
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            drawn.map.invalidateSize();
            if (!hasSize && hasArea(drawn.map.getSize())) {
              hasSize = true;
              drawn.fit();
            }
          });
    observer?.observe(element);

    return () => {
      observer?.disconnect();
      recenter.value = null;
      drawn.map.remove();
    };
  }, [L, map, data, label, credits, inline]);

  const classes = ["sb-geojson-map", className].filter(Boolean).join(" ");
  // An inline map sits in something that already names it (a card), and a
  // landmark for every expanded card would crowd the page's landmark list.
  const isLandmark = Boolean(label) && !inline;

  return (
    <div
      className={classes}
      role={isLandmark ? "region" : undefined}
      aria-label={isLandmark ? label : undefined}
    >
      <div ref={container} className="sb-geojson-map-canvas" />
      {controls || recenter.value ? (
        <div className="sb-geojson-map-controls">
          {controls}
          {recenter.value ? (
            <button
              type="button"
              className="sb-geojson-map-control sb-geojson-map-recenter"
              title={t("map-recenter", { defaultValue: "Back to the place" })}
              aria-label={t("map-recenter", {
                defaultValue: "Back to the place",
              })}
              onClick={() => recenter.value?.()}
            >
              <MaterialIcon>my_location</MaterialIcon>
            </button>
          ) : null}
        </div>
      ) : null}
      {!L && status !== "failed" ? (
        <Skeleton
          shape="block"
          width="100%"
          height="100%"
          radius="0"
          className="sb-geojson-map-overlay"
        />
      ) : null}
      {status === "failed" ? (
        <div className="sb-geojson-map-overlay sb-geojson-map-message">
          <span>
            {t("map-failed-to-load", {
              defaultValue: "The map couldn't load.",
            })}
          </span>
          <button
            type="button"
            className="sb-geojson-map-retry"
            onClick={() => void map.loadLeaflet().catch(() => undefined)}
          >
            {t("try-again", { defaultValue: "Try again" })}
          </button>
        </div>
      ) : null}
      {isInvalid.value ? (
        <p className="sb-geojson-map-overlay sb-geojson-map-message">
          {t("map-place-unavailable", {
            defaultValue: "This place can't be shown on the map.",
          })}
        </p>
      ) : null}
    </div>
  );
}
