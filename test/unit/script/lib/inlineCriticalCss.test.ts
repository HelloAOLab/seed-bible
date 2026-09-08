import {
  CRITICAL_STYLE_PLACEHOLDER,
  injectCriticalStyles,
  isNonCriticalStylesheetId,
  makeStylesheetsNonBlocking,
} from "../../../../script/lib/inlineCriticalCss";

/** The shape `index.html` actually has around these two mechanisms. */
function createHtml(): string {
  return `<!doctype html>
<html>
  <head>
    <link rel="icon" href="/standalone/img/favicon.ico" />
    <style>
      html {
        visibility: hidden;
        opacity: 0;
      }
    </style>
    <style id="sb-critical-styles">${CRITICAL_STYLE_PLACEHOLDER}</style>
    <style id="sb-theme-styles"></style>
  </head>
  <body></body>
</html>`;
}

describe("injectCriticalStyles()", () => {
  const CSS = "html{visibility:visible;opacity:1}.sb-bible-reader{color:red}";

  it("replaces the placeholder with the compiled CSS", () => {
    const html = injectCriticalStyles(createHtml(), CSS);

    expect(html).toContain(`<style id="sb-critical-styles">${CSS}</style>`);
    expect(html).not.toContain(CRITICAL_STYLE_PLACEHOLDER);
  });

  it("keeps the critical style tag after the hidden-by-default rule", () => {
    const html = injectCriticalStyles(createHtml(), CSS);

    expect(html.indexOf("visibility: hidden")).toBeLessThan(html.indexOf(CSS));
  });

  it("is a no-op when there is no placeholder", () => {
    const html = "<html><head><title>x</title></head><body></body></html>";

    expect(injectCriticalStyles(html, CSS)).toBe(html);
  });

  it("throws rather than emit a literal </style> inside the CSS", () => {
    expect(() =>
      injectCriticalStyles(createHtml(), "a{}</style><script>bad</script>")
    ).toThrow();
  });
});

describe("makeStylesheetsNonBlocking()", () => {
  function stylesheetHtml(link: string): string {
    return `<head><link rel="icon" href="/favicon.ico">${link}</head>`;
  }

  it("rewrites a stylesheet link into a preload-swap with a noscript fallback", () => {
    const html = makeStylesheetsNonBlocking(
      stylesheetHtml(
        '<link rel="stylesheet" crossorigin href="/assets/index-ABC123.css">'
      )
    );

    expect(html).toContain(
      'rel="preload" as="style" crossorigin href="/assets/index-ABC123.css" onload="this.onload=null;this.rel=\'stylesheet\'"'
    );
    expect(html).toContain(
      '<noscript><link rel="stylesheet" crossorigin href="/assets/index-ABC123.css"></noscript>'
    );
  });

  it("preserves a link with no crossorigin attribute", () => {
    const html = makeStylesheetsNonBlocking(
      stylesheetHtml('<link rel="stylesheet" href="/assets/index-ABC123.css">')
    );

    expect(html).not.toContain("crossorigin");
    expect(html).toContain('rel="preload" as="style" href=');
  });

  it("leaves non-stylesheet links untouched", () => {
    const html = stylesheetHtml("");

    expect(makeStylesheetsNonBlocking(html)).toBe(html);
  });

  it("only rewrites links whose rel is exactly stylesheet", () => {
    const html = makeStylesheetsNonBlocking(
      stylesheetHtml('<link rel="preconnect" href="https://fonts.gstatic.com">')
    );

    expect(html).toContain('rel="preconnect"');
    expect(html).not.toContain("preload");
  });
});

describe("isNonCriticalStylesheetId()", () => {
  it("matches a plain .css file id", () => {
    expect(isNonCriticalStylesheetId("/src/app/main.css")).toBe(true);
  });

  it("matches a .css id with a query string", () => {
    expect(isNonCriticalStylesheetId("/src/app/main.css?direct")).toBe(true);
  });

  it("does not match a non-css file id", () => {
    expect(isNonCriticalStylesheetId("/src/app/main.tsx")).toBe(false);
  });

  it("does not match the virtual id inline critical CSS is resolved to", () => {
    expect(isNonCriticalStylesheetId("\0inline-critical-css:0")).toBe(false);
  });
});
