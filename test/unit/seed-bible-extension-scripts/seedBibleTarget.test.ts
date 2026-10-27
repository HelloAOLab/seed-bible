import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  pickReleaseTag,
  readSeedBibleDependencySpec,
  refDirName,
  resolveSeedBibleTarget,
} from "../../../packages/seed-bible-extension-scripts/src/lib/seedBibleTarget";

const TAGS = ["v1.11.0", "v1.12.0", "v1.12.3", "v1.13.0", "v2.0.0-beta.1"];

describe("pickReleaseTag", () => {
  it("picks the newest tag that satisfies the range", () => {
    expect(pickReleaseTag(TAGS, "^1.12.0")).toBe("v1.13.0");
    expect(pickReleaseTag(TAGS, "~1.12.0")).toBe("v1.12.3");
    expect(pickReleaseTag(TAGS, "1.11.0")).toBe("v1.11.0");
  });

  it("picks the newest stable release when there's no range", () => {
    // Prereleases are never chosen implicitly.
    expect(pickReleaseTag(TAGS, undefined)).toBe("v1.13.0");
  });

  it("returns undefined when nothing matches", () => {
    expect(pickReleaseTag(TAGS, "^3.0.0")).toBeUndefined();
    expect(pickReleaseTag([], undefined)).toBeUndefined();
  });

  it("ignores tags that aren't versions", () => {
    expect(
      pickReleaseTag(["nightly", "release-candidate", "v1.2.0"], undefined)
    ).toBe("v1.2.0");
  });
});

describe("readSeedBibleDependencySpec", () => {
  it("reads the spec from whichever dependency section has it", () => {
    expect(
      readSeedBibleDependencySpec({ dependencies: { "seed-bible": "^1.13.0" } })
    ).toBe("^1.13.0");
    expect(
      readSeedBibleDependencySpec({
        devDependencies: { "seed-bible": "1.12.0" },
      })
    ).toBe("1.12.0");
    expect(
      readSeedBibleDependencySpec({ dependencies: { preact: "10" } })
    ).toBe(undefined);
  });
});

describe("resolveSeedBibleTarget", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "sb-target-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("prefers --repo over everything else", () => {
    const target = resolveSeedBibleTarget({
      repoOption: tmp,
      versionOption: "develop",
      dependencySpec: "^1.13.0",
      projectRoot: tmp,
    });
    expect(target).toMatchObject({ kind: "checkout", dir: path.resolve(tmp) });
  });

  it("treats --seed-bible-version as a release range or a branch name", () => {
    expect(
      resolveSeedBibleTarget({
        versionOption: "1.12",
        dependencySpec: "^1.13.0",
        projectRoot: tmp,
      })
    ).toMatchObject({ kind: "release", range: "1.12" });
    expect(
      resolveSeedBibleTarget({ versionOption: "develop", projectRoot: tmp })
    ).toMatchObject({ kind: "branch", branch: "develop" });
  });

  it("runs the checkout a link: dependency points into", () => {
    const checkout = path.join(tmp, "seed-bible");
    mkdirSync(path.join(checkout, "packages", "seed-bible"), {
      recursive: true,
    });
    writeFileSync(path.join(checkout, "pnpm-workspace.yaml"), "packages: []\n");
    const project = path.join(tmp, "my-ext");
    mkdirSync(project);

    const target = resolveSeedBibleTarget({
      dependencySpec: "link:../seed-bible/packages/seed-bible",
      projectRoot: project,
    });
    expect(target).toMatchObject({ kind: "checkout", dir: checkout });
  });

  it("errors when a link: dependency isn't inside a seed-bible checkout", () => {
    expect(() =>
      resolveSeedBibleTarget({
        dependencySpec: "link:./nowhere",
        projectRoot: tmp,
      })
    ).toThrow(/isn't inside a seed-bible checkout/);
  });

  it("uses the dependency's version range", () => {
    expect(
      resolveSeedBibleTarget({ dependencySpec: "^1.13.0", projectRoot: tmp })
    ).toMatchObject({ kind: "release", range: "^1.13.0" });
  });

  it("falls back to the newest release without a usable range", () => {
    for (const dependencySpec of [undefined, "*", "workspace:*"]) {
      expect(
        resolveSeedBibleTarget({ dependencySpec, projectRoot: tmp })
      ).toMatchObject({ kind: "release", range: undefined });
    }
  });
});

describe("refDirName", () => {
  it("makes branch names safe to use as a directory name", () => {
    expect(refDirName("feature/new-thing")).toBe("feature_new-thing");
    expect(refDirName("v1.13.0")).toBe("v1.13.0");
  });
});
