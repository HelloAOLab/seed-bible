import {
  buildPlaylistPagePath,
  parsePlaylistPagePath,
  slugifyPlaylistTitle,
} from "@packages/seed-bible/seed-bible/managers/PlaylistPagePath";
import { parseReadingPath } from "@packages/seed-bible/seed-bible/managers/ReadingUrlPath";
import { isNonReadingPagePath } from "@packages/seed-bible/seed-bible/managers/StaticPagePath";

describe("parsePlaylistPagePath", () => {
  it("parses a path with a title slug", () => {
    expect(
      parsePlaylistPagePath("/en/playlist/user-1.playlist_abc/my-list", "")
    ).toEqual({
      language: "en",
      locator: "user-1.playlist_abc",
      slug: "my-list",
    });
  });

  it("parses a path without the optional slug", () => {
    expect(
      parsePlaylistPagePath("/es/playlist/user-1.playlist_abc", "")
    ).toEqual({ language: "es", locator: "user-1.playlist_abc", slug: null });
  });

  it("strips the deployment prefix", () => {
    expect(
      parsePlaylistPagePath("/b/dev/en/playlist/user-1.p/slug", "/b/dev")
        ?.locator
    ).toBe("user-1.p");
  });

  it.each([
    "/en/AAB/genesis/1",
    "/en/playlist",
    "/en/about",
    "/",
    "/en/playlist/user-1.p/slug/extra",
  ])("rejects %s", (path) => {
    expect(parsePlaylistPagePath(path, "")).toBeNull();
  });
});

describe("slugifyPlaylistTitle", () => {
  it.each([
    ["Psalms for Hard Days", "psalms-for-hard-days"],
    ["  Advent: Week 1!  ", "advent-week-1"],
    ["Évangile de Jean", "evangile-de-jean"],
    ["Иоанн 3:16", "иоанн-3-16"],
    ["!!!", ""],
  ])("%s -> %s", (title, slug) => {
    expect(slugifyPlaylistTitle(title)).toBe(slug);
  });

  it("returns an empty slug for no title", () => {
    expect(slugifyPlaylistTitle(null)).toBe("");
  });

  it("cuts a long title at a word boundary", () => {
    const slug = slugifyPlaylistTitle("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.startsWith("word-word")).toBe(true);
  });
});

describe("buildPlaylistPagePath", () => {
  it("round-trips through parsePlaylistPagePath", () => {
    const path = buildPlaylistPagePath({
      language: "en",
      locator: "user-1.playlist_abc",
      title: "Psalms for Hard Days",
    });
    expect(path).toBe("/en/playlist/user-1.playlist_abc/psalms-for-hard-days");
    expect(parsePlaylistPagePath(path, "")).toEqual({
      language: "en",
      locator: "user-1.playlist_abc",
      slug: "psalms-for-hard-days",
    });
  });

  it("omits the slug when the title has nothing to slug", () => {
    expect(
      buildPlaylistPagePath({ language: "en", locator: "u.p", title: null })
    ).toBe("/en/playlist/u.p");
  });

  it("round-trips a non-Latin slug", () => {
    const path = buildPlaylistPagePath({
      language: "ru",
      locator: "u.p",
      title: "Иоанн",
    });
    expect(parsePlaylistPagePath(path, "")?.slug).toBe("иоанн");
  });
});

describe("playlist paths are not reading paths", () => {
  it("does not read a numeric slug as a chapter", () => {
    expect(parseReadingPath("/en/playlist/u.p/2024", "")).toBeNull();
    expect(isNonReadingPagePath("/en/playlist/u.p/2024", "")).toBe(true);
  });

  it("still treats a reading path as one", () => {
    expect(isNonReadingPagePath("/en/AAB/john/3", "")).toBe(false);
  });
});
