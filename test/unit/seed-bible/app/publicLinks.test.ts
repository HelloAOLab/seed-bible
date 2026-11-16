import {
  toInAppUrl,
  toShareableUrl,
} from "@packages/seed-bible/seed-bible/app/publicLinks";
import { injectNativeAppConfig } from "../testUtils/nativeAppConfig";

describe("toShareableUrl", () => {
  it("leaves a link unchanged on the website, which has no public origin set", () => {
    expect(
      toShareableUrl("https://seedbible.org/en/BSB/john/3?verse=16", {}).href
    ).toBe("https://seedbible.org/en/BSB/john/3?verse=16");
  });

  it("moves an Android app link onto the public site, keeping path, query and hash", () => {
    expect(
      toShareableUrl("https://localhost/en/BSB/john/3?verse=16#v16", {
        publicOrigin: "https://seedbible.org",
      }).href
    ).toBe("https://seedbible.org/en/BSB/john/3?verse=16#v16");
  });

  // `capacitor:` is not a scheme the URL standard lets you switch to
  // `https:` by setting `protocol`, so a naive rewrite silently keeps it.
  it("moves an iOS app link (capacitor://) onto the public site", () => {
    expect(
      toShareableUrl("capacitor://localhost/?sessionId=abc", {
        publicOrigin: "https://seedbible.org",
      }).href
    ).toBe("https://seedbible.org/?sessionId=abc");
  });

  it("reads the public origin from the page's injected config by default", () => {
    const remove = injectNativeAppConfig();
    try {
      expect(toShareableUrl("https://localhost/?customization=a.b").href).toBe(
        "https://seedbible.org/?customization=a.b"
      );
    } finally {
      remove();
    }
  });
});

describe("toInAppUrl", () => {
  const PUBLIC = "https://seedbible.org";

  it("maps a public link onto the app's own address", () => {
    expect(
      toInAppUrl(
        "https://seedbible.org/en/playlist/u.p/title?x=1#top",
        PUBLIC,
        "capacitor://localhost/en/BSB/genesis/1"
      )?.href
    ).toBe("capacitor://localhost/en/playlist/u.p/title?x=1#top");
  });

  it("returns null for links to other sites, other schemes, and subdomains", () => {
    for (const url of [
      "https://example.com/en/BSB/john/3",
      "http://seedbible.org/",
      "https://auth.seedbible.org/",
      "mailto:hello@seedbible.org",
    ]) {
      expect(toInAppUrl(url, PUBLIC, "https://localhost/")).toBeNull();
    }
  });

  it("returns null for something that isn't a URL", () => {
    expect(toInAppUrl("not a url", PUBLIC, "https://localhost/")).toBeNull();
  });
});
