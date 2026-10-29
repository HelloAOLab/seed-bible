import {
  formatSiteAddress,
  keepSitePage,
  matchesPathPattern,
  parseCaptureTimestamp,
  parseSiteAddress,
  siteFolder,
  siteSearchPattern,
} from "@packages/seed-bible/seed-bible/managers/customContent/siteImport";
import {
  findPageReferences,
  MAX_BODY_PASSAGES,
} from "@packages/seed-bible/seed-bible/managers/customContent/explicitReferences";

describe("parseSiteAddress", () => {
  it("reads a site however the owner types it", () => {
    for (const typed of [
      "gracecommunity.org/sermons",
      "https://www.GraceCommunity.org/sermons/",
      "  http://gracecommunity.org/sermons  ",
    ]) {
      const site = parseSiteAddress(typed)!;
      expect(site).toEqual({
        host: "gracecommunity.org",
        pathPrefix: "/sermons/",
      });
      expect(siteSearchPattern(site)).toBe("gracecommunity.org/sermons/*");
      expect(formatSiteAddress(site)).toBe("gracecommunity.org/sermons/");
    }
    expect(formatSiteAddress(parseSiteAddress("gracecommunity.org")!)).toBe(
      "gracecommunity.org"
    );
  });

  it("refuses anything that isn't a public host name", () => {
    for (const typed of [
      "",
      "localhost",
      "10.0.0.1",
      "gracecommunity.org:8080",
      "user:pass@gracecommunity.org",
      "ftp://gracecommunity.org",
      "not a site",
    ]) {
      expect(parseSiteAddress(typed)).toBeNull();
    }
  });
});

describe("path filters", () => {
  it("treats a pattern without * as a folder and everything in it", () => {
    expect(matchesPathPattern("/sermons/good-shepherd", "/sermons")).toBe(true);
    expect(matchesPathPattern("/sermons", "sermons")).toBe(true);
    expect(matchesPathPattern("/sermons-archive/x", "/sermons")).toBe(false);
    expect(matchesPathPattern("/blog/2026/easter", "/blog/*/easter")).toBe(
      true
    );
  });

  it("keeps pages inside the includes, outside the excludes and the built-in noise", () => {
    const filters = { include: ["/sermons/"], exclude: ["/sermons/drafts/"] };
    expect(keepSitePage("https://g.org/sermons/a", filters)).toBe(true);
    expect(keepSitePage("https://g.org/blog/a", filters)).toBe(false);
    expect(keepSitePage("https://g.org/sermons/drafts/a", filters)).toBe(false);
    for (const noise of [
      "https://g.org/sermons/tag/john",
      "https://g.org/sermons/page/2",
      "https://g.org/sermons/feed",
      "https://g.org/sermons/a?replytocom=5",
    ]) {
      expect(keepSitePage(noise, {})).toBe(false);
    }
    expect(keepSitePage("https://g.org/research/paper", {})).toBe(true);
  });
});

describe("siteFolder and parseCaptureTimestamp", () => {
  it("groups pages by their first folder, and reads capture times", () => {
    expect(siteFolder("https://g.org/sermons/a")).toBe("/sermons/");
    expect(siteFolder("https://g.org/about")).toBe("/");
    expect(parseCaptureTimestamp("20260914083000")?.toISOString()).toBe(
      "2026-09-14T08:30:00.000Z"
    );
    expect(parseCaptureTimestamp("yesterday")).toBeNull();
  });
});

describe("findPageReferences", () => {
  it("keeps everything the headline names, then the body's most-named passages", () => {
    const references = findPageReferences({
      title: "Sermon on Luke 15",
      description: "",
      text: "Psalm 23 once. John 3:16 twice: John 3:16. Luke 15 again.",
    });
    expect(references.map((r) => `${r.book} ${r.chapter}`)).toEqual([
      "LUK 15",
      "JHN 3",
      "PSA 23",
    ]);
  });

  it("stops at a handful from the body", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Psalm ${i + 1}`).join(
      ". "
    );
    expect(
      findPageReferences({ title: "", description: "", text })
    ).toHaveLength(MAX_BODY_PASSAGES);
  });
});
