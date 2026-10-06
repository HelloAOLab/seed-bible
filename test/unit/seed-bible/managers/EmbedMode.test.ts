import {
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
