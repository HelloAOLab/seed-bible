/**
 * Pure helpers for working with the repo CHANGELOG and version numbers.
 *
 * The release flow keeps these free of file I/O so they can be unit-tested and
 * reused: `script/release.ts` calls `bumpVersion` + `stampChangelog` when
 * preparing a release on `develop`, and `script/changelog.ts extract` calls
 * `extractSection` in CI to build the GitHub Release notes on `main`.
 */

/** The heading that marks the unreleased section at the top of the changelog. */
export const TBD_HEADING = "## TBD";

/**
 * A fresh, empty "unreleased" section dropped in above a newly-stamped version
 * so the next cycle always starts with the emoji subsections ready to fill in.
 * The subsection headings must stay in sync with the ones authored in
 * CHANGELOG.md.
 */
export const FRESH_TBD_SECTION = `## TBD

### ✨ Added

### 🔧 Changed

### 🐛 Fixed

### 🗑️ Removed
`;

export type ReleaseType = "major" | "minor" | "patch";

// A plain MAJOR.MINOR.PATCH version (what we can bump from).
const SEMVER_CORE = /^(\d+)\.(\d+)\.(\d+)$/;
// A full semver, allowing an optional pre-release and build-metadata suffix.
const SEMVER_FULL = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

/** Returns today's date as an ISO `YYYY-MM-DD` string (UTC). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whether `version` is a syntactically valid semver string. */
export function isValidVersion(version: string): boolean {
  return SEMVER_FULL.test(version);
}

/** Whether `version` carries a pre-release suffix (e.g. `1.2.0-rc.1`). */
export function isPrerelease(version: string): boolean {
  return version.includes("-");
}

/**
 * Resolves the next version from a bump keyword or an explicit version.
 *
 * `spec` is one of "major" | "minor" | "patch" (bumped relative to `current`),
 * or an explicit version like "1.4.0" (an optional leading "v" is stripped).
 * Throws on an unbumpable current version or an invalid explicit version.
 */
export function bumpVersion(current: string, spec: string): string {
  if (spec === "major" || spec === "minor" || spec === "patch") {
    const parts = SEMVER_CORE.exec(current);
    if (!parts) {
      throw new Error(
        `Cannot ${spec}-bump "${current}": expected a MAJOR.MINOR.PATCH version.`
      );
    }
    const major = Number(parts[1]);
    const minor = Number(parts[2]);
    const patch = Number(parts[3]);
    if (spec === "major") return `${major + 1}.0.0`;
    if (spec === "minor") return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  }

  const explicit = spec.startsWith("v") ? spec.slice(1) : spec;
  if (!isValidVersion(explicit)) {
    throw new Error(
      `Invalid version "${spec}". Use "major", "minor", "patch", or an explicit X.Y.Z version.`
    );
  }
  return explicit;
}

/**
 * Converts the first `## TBD` heading into `## v<version> — <date>` (em dash)
 * and inserts a fresh empty TBD section above it, so `develop` is ready for the
 * next cycle. Returns the new changelog text. Throws if there is no TBD section.
 */
export function stampChangelog(
  text: string,
  version: string,
  date: string
): string {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.trim() === TBD_HEADING);
  if (index === -1) {
    throw new Error(
      `No "${TBD_HEADING}" section found in the changelog. Add one before releasing.`
    );
  }

  const stampedHeading = `## v${version} — ${date}`;
  // Replace the single TBD heading line with a fresh empty TBD block followed by
  // the stamped heading. FRESH_TBD_SECTION already ends in a newline; the extra
  // blank line keeps Markdown spacing before the stamped heading.
  const replacement = `${FRESH_TBD_SECTION}\n${stampedHeading}`;
  lines.splice(index, 1, replacement);
  return lines.join("\n");
}

/**
 * Returns the release notes for `version`: the lines under the
 * `## v<version> …` heading up to (but excluding) the next `## ` heading,
 * trimmed. Throws if the section is missing or empty so CI never publishes an
 * empty release.
 */
export function extractSection(text: string, version: string): string {
  const lines = text.split("\n");
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRe = new RegExp(`^##\\s+v${escaped}(?:\\s|$)`);
  const start = lines.findIndex((line) => headingRe.test(line));
  if (start === -1) {
    throw new Error(`No changelog section found for version "v${version}".`);
  }

  const body: string[] = [];
  // Stop at the next level-2 heading ("## "); subsection headings ("### ")
  // don't match and are kept as part of the notes.
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    body.push(line);
  }

  const section = body.join("\n").trim();
  if (!section) {
    throw new Error(
      `The changelog section for "v${version}" is empty. Add release notes before releasing.`
    );
  }
  return section;
}
