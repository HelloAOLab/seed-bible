import {
  bumpVersion,
  extractSection,
  isPrerelease,
  isValidVersion,
  stampChangelog,
  TBD_HEADING,
} from "../../../../script/lib/changelog";

const SAMPLE = `# Changelog

## TBD

Summary line for the unreleased work.

### ✨ Added

- Added a thing.

### 🐛 Fixed

- Fixed a thing.

## v1.0.0 — 2026-01-01

### ✨ Added

- The very first release.
`;

describe("bumpVersion", () => {
  it("bumps patch/minor/major", () => {
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
  });

  it("accepts an explicit version and strips a leading v", () => {
    expect(bumpVersion("1.2.3", "2.5.0")).toBe("2.5.0");
    expect(bumpVersion("1.2.3", "v2.5.0")).toBe("2.5.0");
    expect(bumpVersion("1.2.3", "2.0.0-rc.1")).toBe("2.0.0-rc.1");
  });

  it("throws when keyword-bumping a non-core version", () => {
    expect(() => bumpVersion("1.2.3-rc.1", "patch")).toThrow();
  });

  it("throws on an invalid explicit version", () => {
    expect(() => bumpVersion("1.2.3", "nope")).toThrow();
    expect(() => bumpVersion("1.2.3", "1.2")).toThrow();
  });
});

describe("isValidVersion / isPrerelease", () => {
  it("validates semver strings", () => {
    expect(isValidVersion("1.2.3")).toBe(true);
    expect(isValidVersion("1.2.3-rc.1")).toBe(true);
    expect(isValidVersion("1.2")).toBe(false);
    expect(isValidVersion("v1.2.3")).toBe(false);
  });

  it("detects pre-release versions", () => {
    expect(isPrerelease("1.2.0")).toBe(false);
    expect(isPrerelease("1.2.0-rc.1")).toBe(true);
  });
});

describe("stampChangelog", () => {
  it("converts the first TBD into a dated version heading", () => {
    const out = stampChangelog(SAMPLE, "1.1.0", "2026-07-22");
    expect(out).toContain("## v1.1.0 — 2026-07-22");
    // The old TBD content is preserved under the new version heading.
    expect(out).toContain("Summary line for the unreleased work.");
    // The previous release heading is untouched.
    expect(out).toContain("## v1.0.0 — 2026-01-01");
  });

  it("inserts a fresh empty TBD above the stamped heading", () => {
    const out = stampChangelog(SAMPLE, "1.1.0", "2026-07-22");
    const tbdIndex = out.indexOf(TBD_HEADING);
    const versionIndex = out.indexOf("## v1.1.0");
    expect(tbdIndex).toBeGreaterThanOrEqual(0);
    expect(tbdIndex).toBeLessThan(versionIndex);
    // The fresh TBD carries the emoji subsection scaffold.
    const freshTbd = out.slice(tbdIndex, versionIndex);
    expect(freshTbd).toContain("### ✨ Added");
    expect(freshTbd).toContain("### 🗑️ Removed");
  });

  it("stamping then extracting round-trips the notes", () => {
    const out = stampChangelog(SAMPLE, "1.1.0", "2026-07-22");
    const notes = extractSection(out, "1.1.0");
    expect(notes).toContain("Summary line for the unreleased work.");
    expect(notes).toContain("- Added a thing.");
    expect(notes).toContain("- Fixed a thing.");
    // Must not bleed into the next (older) release section.
    expect(notes).not.toContain("The very first release.");
  });

  it("throws when there is no TBD section", () => {
    expect(() =>
      stampChangelog(
        "# Changelog\n\n## v1.0.0 — 2026-01-01\n",
        "1.1.0",
        "2026-07-22"
      )
    ).toThrow();
  });
});

describe("extractSection", () => {
  it("returns a version's notes up to the next heading, trimmed", () => {
    const notes = extractSection(SAMPLE, "1.0.0");
    expect(notes).toBe("### ✨ Added\n\n- The very first release.");
  });

  it("throws for a missing version", () => {
    expect(() => extractSection(SAMPLE, "9.9.9")).toThrow();
  });

  it("throws for an empty section", () => {
    const empty =
      "# Changelog\n\n## v1.0.0 — 2026-01-01\n\n## v0.9.0 — 2025-12-01\n";
    expect(() => extractSection(empty, "1.0.0")).toThrow();
  });
});
