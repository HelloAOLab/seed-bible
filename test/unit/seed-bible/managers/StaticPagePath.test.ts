import {
  buildStaticPagePath,
  parseStaticPagePath,
} from "@packages/seed-bible/seed-bible/managers/StaticPagePath";

describe("parseStaticPagePath", () => {
  it("parses the 2-segment /{lang}/about shape", () => {
    expect(parseStaticPagePath("/en/about", "")).toEqual({
      language: "en",
      page: "about",
    });
  });

  it("strips the deployment basePath before parsing", () => {
    expect(
      parseStaticPagePath("/b/some-branch/es/about", "/b/some-branch")
    ).toEqual({
      language: "es",
      page: "about",
    });
  });

  it("is case-insensitive on the page slug", () => {
    expect(parseStaticPagePath("/en/About", "")).toEqual({
      language: "en",
      page: "about",
    });
  });

  it("returns null for a bare single-segment /about (no language)", () => {
    expect(parseStaticPagePath("/about", "")).toBeNull();
  });

  it("returns null for a 3-segment path", () => {
    expect(parseStaticPagePath("/en/about/extra", "")).toBeNull();
  });

  it("returns null for a 2-segment path whose page isn't recognized", () => {
    expect(parseStaticPagePath("/en/settings", "")).toBeNull();
  });

  // The reading URL scheme's legacy /{book}/{chapter} shape is also
  // 2-segment — this must not misfire on it.
  it("returns null for an ordinary legacy reading URL", () => {
    expect(parseStaticPagePath("/john/3", "")).toBeNull();
  });

  it("returns null for a bare root", () => {
    expect(parseStaticPagePath("/", "")).toBeNull();
  });
});

describe("buildStaticPagePath", () => {
  it("builds the canonical /{lang}/{page} path", () => {
    expect(buildStaticPagePath({ language: "en", page: "about" })).toBe(
      "/en/about"
    );
  });

  it("encodes the language segment", () => {
    expect(buildStaticPagePath({ language: "pt BR", page: "about" })).toBe(
      "/pt%20BR/about"
    );
  });
});
