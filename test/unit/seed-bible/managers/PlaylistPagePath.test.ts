import {
  buildPlaylistPagePath,
  parsePlaylistPagePath,
  slugifyPlaylistTitle,
} from "@packages/seed-bible/seed-bible/managers/PlaylistPagePath";
import { playbackRequestFromUrl } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
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
      step: null,
    });
  });

  it("parses a path without the optional slug", () => {
    expect(
      parsePlaylistPagePath("/es/playlist/user-1.playlist_abc", "")
    ).toEqual({
      language: "es",
      locator: "user-1.playlist_abc",
      slug: null,
      step: null,
    });
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
      step: null,
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

describe("playing paths", () => {
  it("parses a trailing step", () => {
    expect(parsePlaylistPagePath("/en/playlist/u.p/my-list/3", "")).toEqual({
      language: "en",
      locator: "u.p",
      slug: "my-list",
      step: 3,
    });
  });

  it("reads a 4-segment path's last segment as a slug even when it's a number", () => {
    expect(parsePlaylistPagePath("/en/playlist/u.p/2024", "")?.step).toBeNull();
    expect(parsePlaylistPagePath("/en/playlist/u.p/2024", "")?.slug).toBe(
      "2024"
    );
  });

  it.each(["0", "-1", "two", "1.5"])("rejects step %s", (step) => {
    expect(parsePlaylistPagePath(`/en/playlist/u.p/x/${step}`, "")).toBeNull();
  });

  it("builds a step path, with a placeholder slug for an untitled playlist", () => {
    expect(
      buildPlaylistPagePath({
        language: "en",
        locator: "u.p",
        title: "My List",
        step: 2,
      })
    ).toBe("/en/playlist/u.p/my-list/2");
    expect(
      buildPlaylistPagePath({
        language: "en",
        locator: "u.p",
        title: null,
        step: 1,
      })
    ).toBe("/en/playlist/u.p/-/1");
  });
});

describe("playbackRequestFromUrl", () => {
  const request = (href: string) =>
    playbackRequestFromUrl(new URL(href, "http://localhost"), "");

  it("reads a playing path's step as a 0-based index", () => {
    expect(request("/en/playlist/u.p/my-list/3")).toEqual({
      locator: "u.p",
      stepIndex: 2,
    });
  });

  it("asks for no playback on the playlist's own page", () => {
    expect(request("/en/playlist/u.p/my-list")).toBeNull();
  });

  it("still reads the query params an ad-hoc queue uses", () => {
    expect(request("/en/AAB/john/3?playlist=.plan-1&playlistStep=2")).toEqual({
      locator: ".plan-1",
      stepIndex: 2,
    });
  });

  it("asks for no playback on a plain chapter", () => {
    expect(request("/en/AAB/john/3")).toBeNull();
  });
});
