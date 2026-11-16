import { readFileSync } from "fs";
import path from "path";
import { configureIosRelease } from "../../../mobile/scripts/configureIosRelease.mjs";

const PBXPROJ = readFileSync(
  path.resolve(
    __dirname,
    "../../../mobile/ios/App/App.xcodeproj/project.pbxproj"
  ),
  "utf-8"
);

const OPTIONS = {
  teamId: "ABCDE12345",
  profileName: "Seed Bible App Store",
  version: "1.15.0",
  buildNumber: "42",
};

/** The build settings of every configuration with the given name. */
function configurations(pbxproj: string, name: string): string[] {
  return [
    ...pbxproj.matchAll(
      /buildSettings = \{\n([\s\S]*?)\n\t\t\t\};\n\t\t\tname = (\w+);/g
    ),
  ]
    .filter((match) => match[2] === name)
    .map((match) => match[1] ?? "");
}

describe("configureIosRelease", () => {
  it("signs the App target's Release build manually with the given profile and versions", () => {
    const appRelease = configurations(
      configureIosRelease(PBXPROJ, OPTIONS),
      "Release"
    ).find((settings) => settings.includes("INFOPLIST_FILE = App/Info.plist;"));

    expect(appRelease).toContain("CODE_SIGN_STYLE = Manual;");
    expect(appRelease).toContain('CODE_SIGN_IDENTITY = "Apple Distribution";');
    expect(appRelease).toContain('DEVELOPMENT_TEAM = "ABCDE12345";');
    expect(appRelease).toContain(
      'PROVISIONING_PROFILE_SPECIFIER = "Seed Bible App Store";'
    );
    expect(appRelease).toContain('MARKETING_VERSION = "1.15.0";');
    expect(appRelease).toContain('CURRENT_PROJECT_VERSION = "42";');
    // Replaced, not duplicated.
    expect(appRelease?.match(/CODE_SIGN_STYLE/g)).toHaveLength(1);
    expect(appRelease?.match(/MARKETING_VERSION/g)).toHaveLength(1);
  });

  // Command-line signing settings would reach Capacitor's Swift packages too,
  // which fail the build when given a provisioning profile.
  it("leaves every other configuration untouched", () => {
    const result = configureIosRelease(PBXPROJ, OPTIONS);

    expect(configurations(result, "Debug")).toEqual(
      configurations(PBXPROJ, "Debug")
    );
    const otherRelease = (pbxproj: string) =>
      configurations(pbxproj, "Release").filter(
        (settings) => !settings.includes("INFOPLIST_FILE = App/Info.plist;")
      );
    expect(otherRelease(result)).toEqual(otherRelease(PBXPROJ));
  });

  it("escapes quotes in a profile name", () => {
    expect(
      configureIosRelease(PBXPROJ, {
        ...OPTIONS,
        profileName: 'Seed "Bible"',
      })
    ).toContain('PROVISIONING_PROFILE_SPECIFIER = "Seed \\"Bible\\"";');
  });

  it("refuses a project whose App target it can't find", () => {
    expect(() =>
      configureIosRelease(
        PBXPROJ.replaceAll("INFOPLIST_FILE = App/Info.plist;", ""),
        OPTIONS
      )
    ).toThrow(/found 0/);
  });
});
