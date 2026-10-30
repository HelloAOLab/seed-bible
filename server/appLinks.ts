/**
 * The two files that let the native apps (`mobile/`) open seedbible.org links
 * themselves: iOS reads `apple-app-site-association` before honouring the
 * app's Universal Links, and Android reads `assetlinks.json` before verifying
 * its App Links. Each file names the app and proves it is ours — Apple by the
 * developer team id, Android by the fingerprint of the app's signing key —
 * so they are configured per environment rather than committed.
 */

export interface AppLinksConfig {
  /** The app's bundle id / package name, the same on both platforms. */
  appId: string;
  /** Apple Developer team id (10 characters). Empty disables the iOS file. */
  appleTeamId: string;
  /**
   * SHA-256 fingerprints of the Android signing certificates, as
   * `AA:BB:...`. Empty disables the Android file. With Play App Signing this
   * is the key Google signs with, listed under Setup → App signing.
   */
  androidCertFingerprints: string[];
}

export const APPLE_APP_SITE_ASSOCIATION_PATH =
  "/.well-known/apple-app-site-association";
export const ANDROID_ASSET_LINKS_PATH = "/.well-known/assetlinks.json";

export function appLinksConfigFromEnv(
  env: Record<string, string | undefined>
): AppLinksConfig {
  return {
    appId: env.NATIVE_APP_ID?.trim() || "org.seedbible.app",
    appleTeamId: env.APPLE_TEAM_ID?.trim() ?? "",
    androidCertFingerprints: (env.ANDROID_CERT_FINGERPRINTS ?? "")
      .split(",")
      .map((fingerprint) => fingerprint.trim().toUpperCase())
      .filter(Boolean),
  };
}

/**
 * The JSON body to serve for `pathname`, or null when it isn't one of these
 * files or the platform it's for isn't configured.
 */
export function appLinksFileFor(
  pathname: string,
  config: AppLinksConfig
): string | null {
  if (pathname === APPLE_APP_SITE_ASSOCIATION_PATH && config.appleTeamId) {
    return JSON.stringify({
      applinks: {
        details: [
          {
            appIDs: [`${config.appleTeamId}.${config.appId}`],
            components: [
              // Branch deployments are for testing in a browser, not the app.
              { "/": "/b/*", exclude: true },
              { "/": "/*" },
            ],
          },
        ],
      },
    });
  }
  if (
    pathname === ANDROID_ASSET_LINKS_PATH &&
    config.androidCertFingerprints.length > 0
  ) {
    return JSON.stringify([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: config.appId,
          sha256_cert_fingerprints: config.androidCertFingerprints,
        },
      },
    ]);
  }
  return null;
}
