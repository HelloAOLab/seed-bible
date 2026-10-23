/**
 * The workspace packages published to npm, in publish order: `seed-bible`
 * first, so that by the time `create-seed-bible-extension` lands, the
 * `seed-bible` version it scaffolds projects with is already installable.
 */
export const NPM_PACKAGES = [
  "seed-bible",
  "seed-bible-extension-scripts",
  "create-seed-bible-extension",
] as const;

export type NpmChannel = "alpha" | "latest";

const SEMVER =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * The alpha version published from `develop` for a package whose
 * package.json says `version`: the next patch release with an
 * `-alpha.<buildNumber>` suffix, e.g. 1.14.0 + build 42 → 1.14.1-alpha.42.
 *
 * Bumping the patch matters because develop normally still carries the
 * version that was last released to `main`, and semver sorts a prerelease
 * *below* its release (1.14.0-alpha.42 < 1.14.0), so `^1.14.0` would never
 * pick up an alpha. A version that is already a prerelease (e.g. 1.15.0-rc.1)
 * is unreleased, so the build is appended to it instead (1.15.0-rc.1.alpha.42):
 * that sorts just after the prerelease it was built from, where
 * 1.15.0-alpha.42 would sort before it (`alpha` < `rc`).
 */
export function alphaVersion(version: string, buildNumber: string): string {
  if (!/^\d+$/.test(buildNumber)) {
    throw new Error(
      `Invalid build number "${buildNumber}": expected digits only.`
    );
  }
  const parts = SEMVER.exec(version);
  if (!parts) {
    throw new Error(`Invalid version "${version}": expected X.Y.Z.`);
  }
  const major = Number(parts[1]);
  const minor = Number(parts[2]);
  const patch = Number(parts[3]);
  const prerelease = parts[4];
  if (prerelease) {
    return `${major}.${minor}.${patch}-${prerelease}.alpha.${buildNumber}`;
  }
  return `${major}.${minor}.${patch + 1}-alpha.${buildNumber}`;
}

/** The version to publish for `version` on `channel`. */
export function publishVersion(
  version: string,
  channel: NpmChannel,
  buildNumber: string | undefined
): string {
  if (channel === "latest") {
    return version;
  }
  if (!buildNumber) {
    throw new Error("A build number is required for alpha releases.");
  }
  return alphaVersion(version, buildNumber);
}

/**
 * Rewrites only the first `"version"` field of a package.json, so the file's
 * formatting and key order are preserved.
 */
export function replaceVersionField(
  packageJson: string,
  version: string
): string {
  const updated = packageJson.replace(
    /("version"\s*:\s*)"[^"]*"/,
    `$1"${version}"`
  );
  if (updated === packageJson) {
    throw new Error('Could not find a "version" field to update.');
  }
  return updated;
}
