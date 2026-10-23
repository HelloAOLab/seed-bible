import {
  findLocation,
  findLocationsInText,
  findLocationsInVerses,
  getPlaceGeoJsonUrl,
} from "@packages/bible-locations";
import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

describe("findLocationsInText", () => {
  it("finds each known place once, whatever its case", () => {
    expect(
      findLocationsInText("From BETHEL they went up to Jerusalem, then Bethel.")
    ).toEqual([
      { place: "Bethel", geojson: "Bethel" },
      { place: "Jerusalem", geojson: "m66c5b8" },
    ]);
  });

  it("finds nothing in text that names no place", () => {
    expect(findLocationsInText("In the beginning")).toEqual([]);
  });
});

describe("findLocationsInVerses", () => {
  it("reads plain and formatted verse text", () => {
    const verses = [
      { number: 1, content: ["He came to ", { text: "Jerusalem" }, ". "] },
      { number: 2, content: [{ noteId: 1 }, "and on to Bethel"] },
    ] as unknown as ChapterVerse[];

    expect(findLocationsInVerses(verses).map((p) => p.place)).toEqual([
      "Jerusalem",
      "Bethel",
    ]);
  });
});

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
