// Switches the Xcode project's App target to manual App Store signing for a
// CI release build, and stamps its version numbers.
//
// The same settings can't be passed to `xcodebuild` on the command line:
// command-line build settings apply to every target, including Capacitor's
// Swift packages, which fail the build when given a provisioning profile. So
// this edits only the App target's Release configuration in project.pbxproj.
//
// Usage:
//   node configureIosRelease.mjs <project.pbxproj> --team <TEAM_ID> \
//     --profile <profile name> --version <1.2.3> --build <42>

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const quote = (value) => `"${String(value).replace(/(["\\])/g, "\\$1")}"`;

/**
 * Returns `pbxproj` with the App target's Release build settings changed.
 * Throws if that configuration can't be found, rather than quietly producing
 * a build signed some other way.
 */
export function configureIosRelease(
  pbxproj,
  { teamId, profileName, version, buildNumber }
) {
  // A configuration block: `<id> /* Release */ = { ... name = Release; };`
  const blockRe =
    /(\t\t[0-9A-F]{24} \/\* Release \*\/ = \{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = \{\n)([\s\S]*?)(\n\t\t\t\};\n\t\t\tname = Release;\n\t\t\};)/g;
  let matches = 0;
  const result = pbxproj.replace(blockRe, (block, head, settings, tail) => {
    // The App target is the one built from App/Info.plist; the other Release
    // configuration is the project-wide one.
    if (!settings.includes("INFOPLIST_FILE = App/Info.plist;")) {
      return block;
    }
    matches++;
    const overrides = {
      CODE_SIGN_STYLE: "Manual",
      CODE_SIGN_IDENTITY: quote("Apple Distribution"),
      DEVELOPMENT_TEAM: quote(teamId),
      PROVISIONING_PROFILE_SPECIFIER: quote(profileName),
      MARKETING_VERSION: quote(version),
      CURRENT_PROJECT_VERSION: quote(buildNumber),
    };
    let next = settings;
    for (const [key, value] of Object.entries(overrides)) {
      const line = `\t\t\t\t${key} = ${value};`;
      const existing = new RegExp(`^\\t\\t\\t\\t${key} = .*;$`, "m");
      next = existing.test(next)
        ? next.replace(existing, line)
        : `${line}\n${next}`;
    }
    return `${head}${next}${tail}`;
  });
  if (matches !== 1) {
    throw new Error(
      `Expected one Release configuration for the App target, found ${matches}.`
    );
  }
  return result;
}

function parseArgs(argv) {
  const [file, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    options[rest[i].replace(/^--/, "")] = rest[i + 1];
  }
  for (const key of ["team", "profile", "version", "build"]) {
    if (!options[key]) {
      throw new Error(`Missing --${key}.`);
    }
  }
  if (!file) {
    throw new Error("Missing the path to project.pbxproj.");
  }
  return { file, ...options };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { file, team, profile, version, build } = parseArgs(
    process.argv.slice(2)
  );
  writeFileSync(
    file,
    configureIosRelease(readFileSync(file, "utf-8"), {
      teamId: team,
      profileName: profile,
      version,
      buildNumber: build,
    })
  );
}
