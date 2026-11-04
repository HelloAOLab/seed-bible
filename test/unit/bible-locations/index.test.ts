import { findLocation, getPlaceGeoJsonUrl } from "@packages/bible-locations";

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
