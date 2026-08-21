import {
  injectMetaAssetCarriers,
  isLocalAssetPath,
  resolveMetaAssetCarriers,
} from "../../../../script/lib/htmlMetaAssets";

const SITE_ORIGIN = "https://seedbible.org";
const OG_PATH = "/standalone/img/SeedBibleLogoBlackOnWhiteBackground.jpg";
const BUILT_URL =
  "https://assets.example/branches/main/abc123/assets/SeedBibleLogo-HASH.jpg";

/**
 * The shape `index.html` actually has: the og:image tag is spread over several
 * lines, and there are meta tags around it that must be left alone.
 */
function createHtml(ogContent = OG_PATH): string {
  return `<!doctype html>
<html>
  <head>
    <link rel="icon" href="/standalone/img/favicon.ico" />
    <meta property="og:type" content="website" />
    <meta
      property="og:image"
      content="${ogContent}"
    />
    <meta property="og:image:width" content="1200" />
  </head>
  <body></body>
</html>`;
}

/** The carrier links a `pre` pass added, as Vite would leave them. */
function carriersIn(html: string): string[] {
  return [...html.matchAll(/<link\b[^>]*data-meta-asset[^>]*>/gi)].map(
    ([tag]) => tag
  );
}

function ogImageContent(html: string): string | null {
  const match = /<meta\s[^>]*og:image"[^>]*>/i.exec(html);
  if (!match) return null;
  return /content\s*=\s*"([^"]*)"/i.exec(match[0])?.[1] ?? null;
}

describe("isLocalAssetPath()", () => {
  it("accepts repo-relative image paths", () => {
    expect(isLocalAssetPath(OG_PATH)).toBe(true);
    expect(isLocalAssetPath("./logo.png")).toBe(true);
    expect(isLocalAssetPath("/img/icon.svg?v=2")).toBe(true);
  });

  it("rejects anything already served from somewhere else", () => {
    expect(isLocalAssetPath("https://cdn.example/logo.jpg")).toBe(false);
    expect(isLocalAssetPath("//cdn.example/logo.jpg")).toBe(false);
    expect(isLocalAssetPath("data:image/png;base64,AAAA")).toBe(false);
  });

  it("rejects paths that are not images", () => {
    expect(isLocalAssetPath("/standalone/index.tsx")).toBe(false);
    expect(isLocalAssetPath("")).toBe(false);
  });
});

describe("injectMetaAssetCarriers()", () => {
  it("adds one carrier link per targeted meta tag", () => {
    const carriers = carriersIn(injectMetaAssetCarriers(createHtml()));

    expect(carriers).toHaveLength(1);
    expect(carriers[0]).toContain(`href="${OG_PATH}"`);
    expect(carriers[0]).toContain('data-meta-asset="og:image"');
  });

  it("puts the carriers inside <head>, where Vite processes links", () => {
    const html = injectMetaAssetCarriers(createHtml());

    expect(html.indexOf("data-meta-asset")).toBeLessThan(
      html.indexOf("</head>")
    );
  });

  it("does not use a rel that would make browsers fetch the image", () => {
    expect(injectMetaAssetCarriers(createHtml())).not.toContain(
      'rel="preload"'
    );
  });

  it("leaves an og:image that is already absolute alone", () => {
    const html = createHtml("https://cdn.example/logo.jpg");

    expect(injectMetaAssetCarriers(html)).toBe(html);
  });

  it("is a no-op when there is nothing to carry", () => {
    const html = "<html><head><title>x</title></head><body></body></html>";

    expect(injectMetaAssetCarriers(html)).toBe(html);
  });
});

describe("resolveMetaAssetCarriers()", () => {
  /** Stands in for Vite: rewrites the carrier's href the way it does a favicon. */
  function afterVite(html: string, builtUrl: string): string {
    return html.replace(
      /(<link\b[^>]*data-meta-asset[^>]*\bhref=")[^"]*(")/i,
      (_match, prefix: string, suffix: string) =>
        `${prefix}${builtUrl}${suffix}`
    );
  }

  function round(builtUrl: string): string {
    return resolveMetaAssetCarriers(
      afterVite(injectMetaAssetCarriers(createHtml()), builtUrl),
      { siteOrigin: SITE_ORIGIN }
    );
  }

  it("copies the built URL into the meta tag", () => {
    expect(ogImageContent(round(BUILT_URL))).toBe(BUILT_URL);
  });

  it("removes the carrier links", () => {
    expect(carriersIn(round(BUILT_URL))).toEqual([]);
  });

  it("passes an unresolved Vite asset placeholder through verbatim", () => {
    // The html plugin's own resolution pass is a global replace, so a copied
    // placeholder is resolved along with the original.
    const placeholder = "__VITE_ASSET__a1b2c3__";

    expect(ogImageContent(round(placeholder))).toBe(placeholder);
  });

  it("absolutizes a root-relative URL against the site origin", () => {
    expect(ogImageContent(round("/assets/SeedBibleLogo-HASH.jpg"))).toBe(
      `${SITE_ORIGIN}/assets/SeedBibleLogo-HASH.jpg`
    );
  });

  it("does not prefix a URL that is already absolute", () => {
    expect(ogImageContent(round(BUILT_URL))).not.toContain(SITE_ORIGIN);
  });

  it("leaves the surrounding meta tags untouched", () => {
    const html = round(BUILT_URL);

    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
  });

  it("is a no-op when no carriers were injected", () => {
    const html = createHtml();

    expect(resolveMetaAssetCarriers(html, { siteOrigin: SITE_ORIGIN })).toBe(
      html
    );
  });
});
