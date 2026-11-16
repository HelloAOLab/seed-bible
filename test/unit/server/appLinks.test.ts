import {
  ANDROID_ASSET_LINKS_PATH,
  APPLE_APP_SITE_ASSOCIATION_PATH,
  appLinksConfigFromEnv,
  appLinksFileFor,
} from "../../../server/appLinks";

describe("app link verification files", () => {
  it("serves neither file until the platform is configured", () => {
    const config = appLinksConfigFromEnv({});

    expect(appLinksFileFor(APPLE_APP_SITE_ASSOCIATION_PATH, config)).toBeNull();
    expect(appLinksFileFor(ANDROID_ASSET_LINKS_PATH, config)).toBeNull();
  });

  it("names the iOS app by team and bundle id, leaving branch deployments to the browser", () => {
    const config = appLinksConfigFromEnv({ APPLE_TEAM_ID: " ABCDE12345 " });

    expect(
      JSON.parse(appLinksFileFor(APPLE_APP_SITE_ASSOCIATION_PATH, config)!)
    ).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["ABCDE12345.org.seedbible.app"],
            components: [{ "/": "/b/*", exclude: true }, { "/": "/*" }],
          },
        ],
      },
    });
  });

  it("names the Android app by package and every signing key fingerprint", () => {
    const config = appLinksConfigFromEnv({
      NATIVE_APP_ID: "org.example.bible",
      ANDROID_CERT_FINGERPRINTS: "aa:bb , CC:DD,",
    });

    expect(
      JSON.parse(appLinksFileFor(ANDROID_ASSET_LINKS_PATH, config)!)
    ).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "org.example.bible",
          sha256_cert_fingerprints: ["AA:BB", "CC:DD"],
        },
      },
    ]);
  });

  it("ignores every other path", () => {
    const config = appLinksConfigFromEnv({
      APPLE_TEAM_ID: "ABCDE12345",
      ANDROID_CERT_FINGERPRINTS: "AA:BB",
    });

    expect(appLinksFileFor("/apple-app-site-association", config)).toBeNull();
    expect(appLinksFileFor("/en/BSB/john/3", config)).toBeNull();
  });
});
