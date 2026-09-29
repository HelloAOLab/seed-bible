import {
  buildSharedPagePath,
  parseSharedPagePath,
  slugifyTitle,
} from "@packages/seed-bible/seed-bible/managers/SharedPagePath";
import { parseReadingPath } from "@packages/seed-bible/seed-bible/managers/ReadingUrlPath";
import { isNonReadingPagePath } from "@packages/seed-bible/seed-bible/managers/StaticPagePath";

describe("parseSharedPagePath", () => {
  it("parses a path with a title slug", () => {
    expect(
      parseSharedPagePath("/en/playlist/user-1.playlist_abc/my-list", "")
    ).toEqual({
      kind: "playlist",
      language: "en",
      locator: "user-1.playlist_abc",
      slug: "my-list",
    });
  });

  it("parses a path without the optional slug", () => {
    expect(parseSharedPagePath("/es/playlist/user-1.playlist_abc", "")).toEqual(
      {
        kind: "playlist",
        language: "es",
        locator: "user-1.playlist_abc",
        slug: null,
      }
    );
  });

  it("parses a reading plan page", () => {
    expect(
      parseSharedPagePath("/en/reading-plan/user-1.plan_abc/advent", "")
    ).toEqual({
      kind: "readingPlan",
      language: "en",
      locator: "user-1.plan_abc",
      slug: "advent",
    });
  });

  it("strips the deployment prefix", () => {
    expect(
      parseSharedPagePath("/b/dev/en/playlist/user-1.p/slug", "/b/dev")?.locator
    ).toBe("user-1.p");
  });

  it.each([
    "/en/AAB/genesis/1",
    "/en/playlist",
    "/en/about",
    "/",
    "/en/playlist/user-1.p/slug/extra",
  ])("rejects %s", (path) => {
    expect(parseSharedPagePath(path, "")).toBeNull();
  });
});

describe("slugifyTitle", () => {
  it.each([
    ["Psalms for Hard Days", "psalms-for-hard-days"],
    ["  Advent: Week 1!  ", "advent-week-1"],
    ["Évangile de Jean", "evangile-de-jean"],
    ["Иоанн 3:16", "иоанн-3-16"],
    ["!!!", ""],
  ])("%s -> %s", (title, slug) => {
    expect(slugifyTitle(title)).toBe(slug);
  });

  it("returns an empty slug for no title", () => {
    expect(slugifyTitle(null)).toBe("");
  });

  it("cuts a long title at a word boundary", () => {
    const slug = slugifyTitle("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.startsWith("word-word")).toBe(true);
  });
});

describe("buildSharedPagePath", () => {
  it("round-trips through parseSharedPagePath", () => {
    const path = buildSharedPagePath({
      kind: "playlist",
      language: "en",
      locator: "user-1.playlist_abc",
      title: "Psalms for Hard Days",
    });
    expect(path).toBe("/en/playlist/user-1.playlist_abc/psalms-for-hard-days");
    expect(parseSharedPagePath(path, "")).toEqual({
      kind: "playlist",
      language: "en",
      locator: "user-1.playlist_abc",
      slug: "psalms-for-hard-days",
    });
  });

  it("uses the reading-plan segment for a reading plan", () => {
    expect(
      buildSharedPagePath({
        kind: "readingPlan",
        language: "es",
        locator: "u.p",
        title: "Adviento 2026",
      })
    ).toBe("/es/reading-plan/u.p/adviento-2026");
  });

  it("omits the slug when the title has nothing to slug", () => {
    expect(
      buildSharedPagePath({
        kind: "playlist",
        language: "en",
        locator: "u.p",
        title: null,
      })
    ).toBe("/en/playlist/u.p");
  });

  it("round-trips a non-Latin slug", () => {
    const path = buildSharedPagePath({
      kind: "playlist",
      language: "ru",
      locator: "u.p",
      title: "Иоанн",
    });
    expect(parseSharedPagePath(path, "")?.slug).toBe("иоанн");
  });
});

describe("shared page paths are not reading paths", () => {
  it.each(["/en/playlist/u.p/2024", "/en/reading-plan/u.p/2024"])(
    "does not read the numeric slug in %s as a chapter",
    (path) => {
      expect(parseReadingPath(path, "")).toBeNull();
      expect(isNonReadingPagePath(path, "")).toBe(true);
    }
  );

  it("still treats a reading path as one", () => {
    expect(isNonReadingPagePath("/en/AAB/john/3", "")).toBe(false);
  });
});
