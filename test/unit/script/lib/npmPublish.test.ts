import {
  alphaVersion,
  publishVersion,
  replaceVersionField,
} from "../../../../script/lib/npmPublish";

describe("alphaVersion", () => {
  it("bumps the patch so the alpha sorts above the last release", () => {
    expect(alphaVersion("1.14.0", "18630400059")).toBe(
      "1.14.1-alpha.18630400059"
    );
  });

  it("extends a prerelease so the alpha sorts after it", () => {
    // Semver ranks a longer prerelease above one it extends
    // (1.15.0-rc.1.alpha.42 > 1.15.0-rc.1); 1.15.0-alpha.42 would rank below.
    expect(alphaVersion("1.15.0-rc.1", "42")).toBe("1.15.0-rc.1.alpha.42");
  });

  it("drops build metadata from the version it starts from", () => {
    expect(alphaVersion("1.15.0-rc.1+abc", "42")).toBe("1.15.0-rc.1.alpha.42");
  });

  it("rejects a non-numeric build number", () => {
    expect(() => alphaVersion("1.0.0", "abc")).toThrow(/build number/);
  });

  it("rejects a malformed version", () => {
    expect(() => alphaVersion("1.0", "1")).toThrow(/Invalid version/);
  });
});

describe("publishVersion", () => {
  it("publishes the package.json version unchanged on latest", () => {
    expect(publishVersion("0.1.0", "latest", undefined)).toBe("0.1.0");
  });

  it("requires a build number on alpha", () => {
    expect(() => publishVersion("0.1.0", "alpha", undefined)).toThrow(
      /build number is required/
    );
  });

  it("produces an alpha version on alpha", () => {
    expect(publishVersion("0.1.0", "alpha", "7")).toBe("0.1.1-alpha.7");
  });
});

describe("replaceVersionField", () => {
  it("replaces only the top-level version and keeps formatting", () => {
    const input = `{\n  "name": "x",\n  "version": "1.0.0",\n  "dependencies": {\n    "y": "1.0.0"\n  }\n}\n`;
    expect(replaceVersionField(input, "1.0.1-alpha.3")).toBe(
      input.replace('"version": "1.0.0"', '"version": "1.0.1-alpha.3"')
    );
  });

  it("leaves the file unchanged when the version is already the one asked for", () => {
    // The latest channel publishes the package.json version as-is.
    const input = `{\n  "name": "x",\n  "version": "1.0.0"\n}\n`;
    expect(replaceVersionField(input, "1.0.0")).toBe(input);
  });

  it("throws when there is no version field", () => {
    expect(() => replaceVersionField(`{ "name": "x" }`, "1.0.0")).toThrow(
      /version/
    );
  });
});
