import {
  findLocation,
  getPlaceAttribution,
  getPlaceGeoJsonUrl,
  OPENBIBLE_ATTRIBUTION,
  toStandardGeoJson,
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

describe("toStandardGeoJson", () => {
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

    expect(toStandardGeoJson(ACCO, file)).toEqual({
      geometry: {
        coordinates: [35.087499999999999, 32.921300000000002],
        type: "Point",
      },
      properties: { id: "Acco" },
      type: "Feature",
    });
  });

  it("leaves the fetched file itself untouched", () => {
    const file = {
      type: "Feature",
      geometry: { type: "Point", coordinates: ["32.9213", "35.0875"] },
      properties: {},
    };

    toStandardGeoJson(ACCO, file);

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

    expect(toStandardGeoJson(ACCO, file)).toEqual({
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

  it("passes OpenBible's files through as they are", () => {
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

    expect(toStandardGeoJson(JERUSALEM, file)).toBe(file);
  });

  it("copes with a hand-built file that has no geometry", () => {
    expect(
      toStandardGeoJson(ACCO, { type: "Feature", geometry: null })
    ).toEqual({ type: "Feature", geometry: null });
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
