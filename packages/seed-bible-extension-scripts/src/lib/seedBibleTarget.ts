import { existsSync } from "node:fs";
import path from "node:path";
import semver from "semver";

/** Which Seed Bible `dev` should run, and why (for logging). */
export type SeedBibleTarget =
  | { kind: "checkout"; dir: string; reason: string }
  | { kind: "release"; range: string | undefined; reason: string }
  | { kind: "branch"; branch: string; reason: string };

export interface TargetInputs {
  /** `--repo <path>`. */
  repoOption?: string;
  /** `--seed-bible-version <range|branch>`. */
  versionOption?: string;
  /** The extension's `seed-bible` dependency specifier, if any. */
  dependencySpec?: string;
  /** The extension project's root, which a `link:`/`file:` spec is relative to. */
  projectRoot: string;
}

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function readSeedBibleDependencySpec(
  packageJson: PackageJsonLike
): string | undefined {
  return (
    packageJson.dependencies?.["seed-bible"] ??
    packageJson.devDependencies?.["seed-bible"] ??
    packageJson.peerDependencies?.["seed-bible"]
  );
}

/** Walks up from `start` to the directory holding `pnpm-workspace.yaml`. */
export function findCheckoutRoot(start: string): string | undefined {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

const LOCAL_PATH_PROTOCOLS = ["link:", "file:"];

/**
 * Decides which Seed Bible to run. First match wins: `--repo`, then
 * `--seed-bible-version`, then a `link:`/`file:` dependency (run the checkout
 * it points into), then the dependency's version range, then the newest
 * release.
 */
export function resolveSeedBibleTarget(inputs: TargetInputs): SeedBibleTarget {
  if (inputs.repoOption) {
    return {
      kind: "checkout",
      dir: path.resolve(inputs.repoOption),
      reason: "--repo",
    };
  }

  if (inputs.versionOption) {
    return semver.validRange(inputs.versionOption)
      ? {
          kind: "release",
          range: inputs.versionOption,
          reason: "--seed-bible-version",
        }
      : {
          kind: "branch",
          branch: inputs.versionOption,
          reason: "--seed-bible-version",
        };
  }

  const spec = inputs.dependencySpec;
  const protocol = spec
    ? LOCAL_PATH_PROTOCOLS.find((p) => spec.startsWith(p))
    : undefined;
  if (spec && protocol) {
    const target = path.resolve(
      inputs.projectRoot,
      spec.slice(protocol.length)
    );
    const dir = findCheckoutRoot(target);
    if (!dir) {
      throw new Error(
        `The "seed-bible" dependency points at ${target}, which isn't inside a seed-bible checkout (no pnpm-workspace.yaml above it). Pass --repo <path> instead.`
      );
    }
    return {
      kind: "checkout",
      dir,
      reason: `"seed-bible": "${spec}" in package.json`,
    };
  }

  if (spec && semver.validRange(spec) && spec !== "*") {
    return {
      kind: "release",
      range: spec,
      reason: `"seed-bible": "${spec}" in package.json`,
    };
  }

  return {
    kind: "release",
    range: undefined,
    reason: spec
      ? `"seed-bible": "${spec}" isn't a version range; using the newest release`
      : `no "seed-bible" dependency; using the newest release`,
  };
}

/**
 * The newest release tag (`v1.2.3`) satisfying `range`, or the newest stable
 * one when `range` is undefined. Prereleases are only picked by a range that
 * names them, and tags that aren't versions are ignored.
 */
export function pickReleaseTag(
  tags: string[],
  range: string | undefined
): string | undefined {
  const versions = tags
    .filter((tag) => /^v\d/.test(tag))
    .map((tag) => semver.valid(tag.slice(1)))
    .filter((v): v is string => v !== null);
  // `*` excludes prereleases the same way an explicit range does.
  const best = semver.maxSatisfying(versions, range ?? "*");
  return best ? `v${best}` : undefined;
}

/** A cache-safe directory name for a branch or tag (`feature/x` → `feature_x`). */
export function refDirName(ref: string): string {
  return ref.replace(/[^A-Za-z0-9._-]/g, "_");
}
