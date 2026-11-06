import type { FeatureCollection } from "geojson";
import {
  findLocation,
  getPlaceAttribution,
  getPlaceGeoJsonUrl,
  OPENBIBLE_ATTRIBUTION,
  toMapGeoJson,
} from "@packages/bible-locations";

describe("findLocation", () => {
  it("looks a place up whatever its case", () => {
    expect(findLocation("jERUSALEM")).toEqual({
      place: "Jerusalem",
      geojson: "m66c5b8",
    });
  });

  it("answers null for an unknown place", () => {
    expect(findLocation("Atlantis")).toBeNull();
  });
});

describe("getPlaceGeoJsonUrl", () => {
  it("points a hand-built place at its own file", () => {
    expect(getPlaceGeoJsonUrl({ place: "Bethel", geojson: "Bethel" })).toBe(
      "https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/Bethel.geojson"
    );
  });

  it("points any other place at OpenBible's file", () => {
    expect(getPlaceGeoJsonUrl({ place: "Jerusalem", geojson: "m66c5b8" })).toBe(
      "https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/m66c5b8.geojson"
    );
  });
});

describe("toMapGeoJson", () => {
  const ACCO = { place: "Acco", geojson: "Acco" };
  const JERUSALEM = { place: "Jerusalem", geojson: "m66c5b8" };

  it("flips a hand-built point into longitude-first numbers", () => {
    // Acco's file exactly as the isreal_geojson repo serves it.
    const file = {
      geometry: {
        coordinates: ["32.921300000000002", "35.087499999999999"],
        type: "Point",
      },
      properties: { id: "Acco" },
      type: "Feature",
    };

    expect(toMapGeoJson(ACCO, file)).toEqual({
      geometry: {
        coordinates: [35.087499999999999, 32.921300000000002],
        type: "Point",
      },
      properties: { id: "Acco" },
      type: "Feature",
    });
  });

  it("leaves an empty list of positions empty", () => {
    const file = {
      type: "Feature",
      geometry: { type: "MultiPoint", coordinates: [] },
      properties: {},
    };

    expect(toMapGeoJson(ACCO, file)).toEqual(file);
  });

  it("leaves the fetched file itself untouched", () => {
    const file = {
      type: "Feature",
      geometry: { type: "Point", coordinates: ["32.9213", "35.0875"] },
      properties: {},
    };

    toMapGeoJson(ACCO, file);

    expect(file.geometry.coordinates).toEqual(["32.9213", "35.0875"]);
  });

  it("flips every position of a hand-built collection, outlines included", () => {
    const file = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [31.1, 35.1],
                [31.2, 35.2],
                [31.1, 35.1],
              ],
            ],
          },
          properties: {},
        },
        {
          type: "Feature",
          geometry: {
            type: "GeometryCollection",
            geometries: [{ type: "Point", coordinates: [31.3, 35.3] }],
          },
          properties: {},
        },
      ],
    };

    expect(toMapGeoJson(ACCO, file)).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [35.1, 31.1],
                [35.2, 31.2],
                [35.1, 31.1],
              ],
            ],
          },
          properties: {},
        },
        {
          type: "Feature",
          geometry: {
            type: "GeometryCollection",
            geometries: [{ type: "Point", coordinates: [35.3, 31.3] }],
          },
          properties: {},
        },
      ],
    });
  });

  it("passes an OpenBible file without roles through as it is", () => {
    const file = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [35.234167, 31.776667] },
          properties: { id: "m66c5b8.point" },
        },
      ],
    };

    expect(toMapGeoJson(JERUSALEM, file)).toBe(file);
  });

  describe("an OpenBible file, which holds several versions of a place", () => {
    const CRETE = { place: "Crete", geojson: "mf93341" };

    function feature(role: string, type: string, coordinates: unknown) {
      return {
        type: "Feature",
        geometry: { type, coordinates },
        properties: { id: `x.${role}`, role },
      };
    }

    const square = (size: number) => [
      [
        [0, 0],
        [size, 0],
        [size, size],
        [0, 0],
      ],
    ];

    it("draws one outline for a place with one, OpenStreetMap's first", () => {
      const precise = feature("precise", "Polygon", square(3));
      const file = {
        type: "FeatureCollection",
        features: [
          feature("representative_point", "Point", [1, 1]),
          feature("geometry", "Polygon", square(2)),
          feature("simplified_geometry", "Polygon", square(2)),
          precise,
          feature("simplified_precise", "Polygon", square(3)),
        ],
      };

      expect(toMapGeoJson(CRETE, file)).toEqual({
        type: "FeatureCollection",
        features: [precise],
      });
    });

    it("falls back to OpenBible's own outline", () => {
      const geometry = feature("geometry", "Polygon", square(2));
      const file = {
        type: "FeatureCollection",
        features: [feature("representative_point", "Point", [1, 1]), geometry],
      };

      expect(toMapGeoJson(CRETE, file)).toEqual({
        type: "FeatureCollection",
        features: [geometry],
      });
    });

    it("shades a region's confidence bands, without its labelling point", () => {
      const file = {
        type: "FeatureCollection",
        features: [
          feature("representative_point", "Point", [1, 1]),
          feature("isobands", "MultiPolygon", [
            square(3),
            square(2),
            square(1),
          ]),
        ],
      };

      const drawn = toMapGeoJson(CRETE, file) as FeatureCollection;

      expect(drawn.features.map((band) => band.geometry)).toEqual([
        { type: "Polygon", coordinates: square(3) },
        { type: "Polygon", coordinates: square(2) },
        { type: "Polygon", coordinates: square(1) },
      ]);
      for (const band of drawn.features) {
        expect(band.properties?.mapShade).toBeGreaterThan(0);
        expect(band.properties?.mapShade).toBeLessThan(0.2);
      }
    });

    it("draws a settlement's point, with its remains as a detail and without its precision circle", () => {
      const point = feature("point", "Point", [1, 1]);
      const local = feature("local", "Polygon", square(1));
      const file = {
        type: "FeatureCollection",
        features: [
          point,
          local,
          feature("simplified_local", "Polygon", square(1)),
          feature("precision_radius", "Polygon", square(2)),
        ],
      };

      expect(toMapGeoJson(JERUSALEM, file)).toEqual({
        type: "FeatureCollection",
        features: [
          point,
          { ...local, properties: { ...local.properties, mapDetail: true } },
        ],
      });
    });

    it("draws a settlement with no remains as its point alone", () => {
      const point = feature("point", "Point", [1, 1]);
      const file = {
        type: "FeatureCollection",
        features: [point, feature("precision_radius", "Polygon", square(2))],
      };

      expect(toMapGeoJson(JERUSALEM, file)).toEqual({
        type: "FeatureCollection",
        features: [point],
      });
    });
  });

  it("copes with a hand-built file that has no geometry", () => {
    expect(toMapGeoJson(ACCO, { type: "Feature", geometry: null })).toEqual({
      type: "Feature",
      geometry: null,
    });
  });
});

describe("getPlaceAttribution", () => {
  it("credits OpenBible for its places", () => {
    expect(
      getPlaceAttribution({ place: "Jerusalem", geojson: "m66c5b8" })
    ).toEqual([OPENBIBLE_ATTRIBUTION]);
    expect(OPENBIBLE_ATTRIBUTION).toContain("CC BY 4.0");
  });

  it("needs no credit for the project's own hand-built places", () => {
    expect(getPlaceAttribution({ place: "Acco", geojson: "Acco" })).toEqual([]);
  });
});
