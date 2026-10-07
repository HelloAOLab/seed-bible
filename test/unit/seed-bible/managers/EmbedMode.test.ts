import {
  buildEmbedIframeHtml,
  buildEmbedUrl,
  isMinimalEmbedQueryValue,
  isMinimalEmbedUrl,
  urlWithoutEmbedParam,
} from "@packages/seed-bible/seed-bible/managers/EmbedMode";

describe("isMinimalEmbedQueryValue", () => {
  it.each(["minimal", "true", "MINIMAL", "True"])(
    "treats %j as compact embed chrome",
    (value) => {
      expect(isMinimalEmbedQueryValue(value)).toBe(true);
    }
  );

  it.each([null, "", "1", "yes", "false", "full"])(
    "leaves the full app alone for %j",
    (value) => {
      expect(isMinimalEmbedQueryValue(value)).toBe(false);
    }
  );
});

describe("isMinimalEmbedUrl", () => {
  it("reads embed=minimal off the query string", () => {
    expect(
      isMinimalEmbedUrl(
        new URL("http://localhost:3000/en/AAB/genesis/1?embed=minimal")
      )
    ).toBe(true);
  });

  it("treats embed=true as the same compact chrome", () => {
    expect(
      isMinimalEmbedUrl(new URL("http://localhost:3000/?embed=true"))
    ).toBe(true);
  });

  it("stays off when the param is missing", () => {
    expect(
      isMinimalEmbedUrl(new URL("http://localhost:3000/en/AAB/genesis/1"))
    ).toBe(false);
  });
});

describe("urlWithoutEmbedParam", () => {
  it("strips embed and keeps the chapter and other params", () => {
    const next = urlWithoutEmbedParam(
      new URL(
        "http://localhost:3000/en/AAB/genesis/1?embed=minimal&verse=2&lang=en"
      )
    );

    expect(next.searchParams.has("embed")).toBe(false);
    expect(next.pathname).toBe("/en/AAB/genesis/1");
    expect(next.searchParams.get("verse")).toBe("2");
    expect(next.searchParams.get("lang")).toBe("en");
  });

  it("returns an equivalent URL when embed was never set", () => {
    const href = "http://localhost:3000/en/AAB/genesis/1?verse=4";
    expect(urlWithoutEmbedParam(new URL(href)).href).toBe(href);
  });
});

describe("buildEmbedUrl", () => {
  const shareUrl = new URL("http://localhost:3000/en/BSB/genesis/1?verse=2");

  it("opens the compact embed on the system theme", () => {
    const url = buildEmbedUrl(shareUrl, { themeId: "system" });

    expect(url.pathname).toBe("/en/BSB/genesis/1");
    expect(url.searchParams.get("verse")).toBe("2");
    expect(url.searchParams.get("embed")).toBe("minimal");
    expect(url.searchParams.get("app.themeId")).toBe("system");
    expect(url.searchParams.has("customization")).toBe(false);
  });

  it("keeps the customization the viewer is looking at", () => {
    const url = buildEmbedUrl(shareUrl, {
      themeId: "dark",
      customizationLocator: "alice.custom-1",
    });

    expect(url.searchParams.get("app.themeId")).toBe("dark");
    expect(url.searchParams.get("customization")).toBe("alice.custom-1");
    expect(url.searchParams.get("embed")).toBe("minimal");
    expect(url.searchParams.get("verse")).toBe("2");
  });

  it("drops a customization that is no longer on screen", () => {
    const url = buildEmbedUrl(
      new URL(
        "http://localhost:3000/en/BSB/genesis/1?verse=2&customization=old.one"
      ),
      { themeId: "system", customizationLocator: null }
    );

    expect(url.searchParams.has("customization")).toBe(false);
    expect(url.searchParams.get("embed")).toBe("minimal");
    expect(url.searchParams.get("verse")).toBe("2");
  });

  it("leaves the passage link it was given unchanged", () => {
    const given = new URL(
      "http://localhost:3000/en/BSB/genesis/1?verse=2&customization=old.one"
    );
    const before = given.href;

    buildEmbedUrl(given, {
      themeId: "light",
      customizationLocator: "alice.custom-1",
    });

    expect(given.href).toBe(before);
  });
});

describe("buildEmbedIframeHtml", () => {
  it("escapes the embed link into an iframe", () => {
    const html = buildEmbedIframeHtml(
      new URL(
        "http://localhost:3000/en/BSB/genesis/1?embed=minimal&app.themeId=system"
      ),
      'Seed "Bible"'
    );

    expect(html).toBe(
      '<iframe src="http://localhost:3000/en/BSB/genesis/1?embed=minimal&amp;app.themeId=system" title="Seed &quot;Bible&quot;" width="560" height="400" style="border:0" allowfullscreen></iframe>'
    );
  });
});
