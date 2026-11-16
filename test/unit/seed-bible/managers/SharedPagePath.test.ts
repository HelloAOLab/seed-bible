import {
  buildSharedPagePath,
  parseRecordLocator,
  parseSharedPagePath,
  slugifyTitle,
} from "@packages/seed-bible/seed-bible/managers/SharedPagePath";
import { playbackRequestFromUrl } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
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
      step: null,
      edit: null,
    });
  });

  it("parses a path without the optional slug", () => {
    expect(parseSharedPagePath("/es/playlist/user-1.playlist_abc", "")).toEqual(
      {
        kind: "playlist",
        language: "es",
        locator: "user-1.playlist_abc",
        slug: null,
        step: null,
        edit: null,
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
      step: null,
      edit: null,
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
      step: null,
      edit: null,
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

describe("playing paths", () => {
  it("parses a trailing step", () => {
    expect(parseSharedPagePath("/en/playlist/u.p/my-list/3", "")).toEqual({
      kind: "playlist",
      language: "en",
      locator: "u.p",
      slug: "my-list",
      step: 3,
      edit: null,
    });
  });

  it("reads a 4-segment path's last segment as a slug even when it's a number", () => {
    expect(parseSharedPagePath("/en/playlist/u.p/2024", "")?.step).toBeNull();
    expect(parseSharedPagePath("/en/playlist/u.p/2024", "")?.slug).toBe("2024");
  });

  it.each(["0", "-1", "two", "1.5"])("rejects step %s", (step) => {
    expect(parseSharedPagePath(`/en/playlist/u.p/x/${step}`, "")).toBeNull();
  });

  it("builds a step path, with a placeholder slug for an untitled playlist", () => {
    expect(
      buildSharedPagePath({
        kind: "playlist",
        language: "en",
        locator: "u.p",
        title: "My List",
        step: 2,
      })
    ).toBe("/en/playlist/u.p/my-list/2");
    expect(
      buildSharedPagePath({
        kind: "playlist",
        language: "en",
        locator: "u.p",
        title: null,
        step: 1,
      })
    ).toBe("/en/playlist/u.p/-/1");
  });
});

describe("playlist editor paths", () => {
  const parse = (path: string) => parseSharedPagePath(path, "");

  it.each([
    ["/en/playlist/u.p/my-list/edit", { screen: "steps" }],
    ["/en/playlist/u.p/my-list/edit/details", { screen: "details" }],
    [
      "/en/playlist/u.p/my-list/edit/step/3",
      { screen: "step", step: 3, settings: false },
    ],
    [
      "/en/playlist/u.p/my-list/edit/step/3/settings",
      { screen: "step", step: 3, settings: true },
    ],
  ])("reads %s as an editor screen, not playback", (path, edit) => {
    expect(parse(path)).toEqual({
      kind: "playlist",
      language: "en",
      locator: "u.p",
      slug: "my-list",
      step: null,
      edit,
    });
    expect(
      playbackRequestFromUrl(new URL(path, "http://localhost"), "")
    ).toBeNull();
    expect(isNonReadingPagePath(path, "")).toBe(true);
  });

  it.each([
    "/en/playlist/u.p/my-list/edit/step",
    "/en/playlist/u.p/my-list/edit/step/0",
    "/en/playlist/u.p/my-list/edit/step/two",
    "/en/playlist/u.p/my-list/edit/step/2/other",
    "/en/playlist/u.p/my-list/edit/details/more",
    "/en/playlist/u.p/my-list/edit/elsewhere",
    "/en/playlist/u.p/my-list/3/edit",
    "/en/reading-plan/u.p/my-plan/edit",
  ])("rejects %s", (path) => {
    expect(parse(path)).toBeNull();
  });

  it('reads a playlist titled "Edit" as its slug, not the editor', () => {
    expect(parse("/en/playlist/u.p/edit")).toMatchObject({
      slug: "edit",
      edit: null,
    });
  });

  it("builds each screen's path, with a placeholder slug for an untitled playlist", () => {
    const build = (
      title: string | null,
      edit: Parameters<typeof buildSharedPagePath>[0]["edit"]
    ) =>
      buildSharedPagePath({
        kind: "playlist",
        language: "en",
        locator: "u.p",
        title,
        edit,
      });
    expect(build("My List", { screen: "steps" })).toBe(
      "/en/playlist/u.p/my-list/edit"
    );
    expect(build("My List", { screen: "details" })).toBe(
      "/en/playlist/u.p/my-list/edit/details"
    );
    expect(build("My List", { screen: "step", step: 2, settings: false })).toBe(
      "/en/playlist/u.p/my-list/edit/step/2"
    );
    expect(build(null, { screen: "step", step: 2, settings: true })).toBe(
      "/en/playlist/u.p/-/edit/step/2/settings"
    );
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

describe("parseRecordLocator", () => {
  it("splits a locator on its last dot, so a record name can contain dots", () => {
    expect(parseRecordLocator("user.name.playlist_abc")).toEqual({
      recordName: "user.name",
      address: "playlist_abc",
    });
  });

  it.each([null, undefined, "", "no-dot", ".address", "record."])(
    "rejects %j",
    (locator) => {
      expect(parseRecordLocator(locator)).toBeNull();
    }
  );
});
