import {
  checkManifestPermissions,
  KNOWN_PERMISSIONS,
  OPTIONAL_ONLY_PERMISSIONS,
} from "@packages/seed-bible-extension-scripts/src/lib/manifestPolicy";
import {
  SANDBOX_PERMISSION_INFO,
  SANDBOX_PERMISSIONS,
} from "@packages/seed-bible/seed-bible/extensions/protocol";

describe("the extension tooling's copy of the permission policy", () => {
  it("matches Seed Bible's own", () => {
    expect([...KNOWN_PERMISSIONS].sort()).toEqual(
      [...SANDBOX_PERMISSIONS].sort()
    );
    expect([...OPTIONAL_ONLY_PERMISSIONS].sort()).toEqual(
      SANDBOX_PERMISSIONS.filter(
        (p) => !SANDBOX_PERMISSION_INFO[p].requirable
      ).sort()
    );
  });
});

describe("checkManifestPermissions()", () => {
  const meta = { id: "x", translations: {} };

  it("accepts a manifest Seed Bible would install", () => {
    expect(
      checkManifestPermissions({
        ...meta,
        permissions: ["reading:selection"],
        optionalPermissions: ["notes:write"],
      })
    ).toEqual([]);
  });

  it("says to move an optional-only permission, and flags unknown ones", () => {
    const problems = checkManifestPermissions({
      ...meta,
      permissions: ["notes:write"],
      optionalPermissions: ["camera"],
    });
    expect(problems).toHaveLength(2);
    expect(problems.join("\n")).toContain(
      'move it from "permissions" to "optionalPermissions"'
    );
    expect(problems.join("\n")).toContain('"camera"');
  });
});
