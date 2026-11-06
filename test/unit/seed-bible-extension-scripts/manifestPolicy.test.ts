import {
  checkManifestPermissions,
  checkPermissionUses,
  findPermissionUses,
  IMPLIED_PERMISSIONS,
  KNOWN_PERMISSIONS,
  OPTIONAL_ONLY_PERMISSIONS,
  SDK_PERMISSIONS,
} from "@packages/seed-bible-extension-scripts/src/lib/manifestPolicy";
import { isSandboxedProject } from "@packages/seed-bible-extension-scripts/src/lib/sandboxedProject";
import {
  SANDBOX_METHOD_PERMISSIONS,
  SANDBOX_PERMISSION_INFO,
  SANDBOX_PERMISSIONS,
  type SandboxMethod,
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
    expect(IMPLIED_PERMISSIONS).toEqual(
      Object.fromEntries(
        SANDBOX_PERMISSIONS.filter(
          (p) => SANDBOX_PERMISSION_INFO[p].implies
        ).map((p) => [p, SANDBOX_PERMISSION_INFO[p].implies])
      )
    );
  });

  it("knows the permission behind every call that needs one", () => {
    // Where the SDK's name for a call differs from the call itself.
    const sdkName: Partial<Record<SandboxMethod, string>> = {
      "discover.register": "discover.registerProvider",
      "chats.register": "chats.registerProvider",
    };
    // Reached through a handle (`portal.send`), which can't be told apart
    // from any other `.send(` in the code; opening it is checked instead.
    const notVisible: SandboxMethod[] = ["portals.send"];
    for (const [method, permission] of Object.entries(
      SANDBOX_METHOD_PERMISSIONS
    ) as [SandboxMethod, string][]) {
      if (notVisible.includes(method)) continue;
      expect({
        method,
        permission: SDK_PERMISSIONS[sdkName[method] ?? method],
      }).toEqual({
        method,
        permission,
      });
    }
    // `chat:shared` is a flag on a chat provider, not a call of its own.
    expect(
      SANDBOX_PERMISSIONS.filter(
        (p) => !Object.values(SDK_PERMISSIONS).includes(p)
      )
    ).toEqual(["chat:shared"]);
  });
});

describe("checking the code against extension.json", () => {
  const meta = { id: "x", translations: {} };
  const code = (text: string) => [{ path: "src/main.tsx", text }];

  it("finds what the code uses, and where", () => {
    expect(
      findPermissionUses(
        code(
          "await sb.reading.open(ref);\nconst p = sb.reading.position.value;\nsb.app.toast('hi');"
        )
      )
    ).toEqual([
      {
        api: "reading.open",
        permission: "reading:navigate",
        at: "src/main.tsx:1",
      },
      {
        api: "reading.position",
        permission: "reading:position",
        at: "src/main.tsx:2",
      },
    ]);
  });

  it("is an error to use what extension.json doesn't declare", () => {
    const { errors } = checkPermissionUses(
      meta,
      findPermissionUses(code("await sb.notes.create(note);"))
    );
    expect(errors).toEqual([
      expect.stringContaining(
        'src/main.tsx:1 uses sb.notes.create, which needs "notes:write". Add it to "optionalPermissions"'
      ),
    ]);
  });

  it("counts what a declared permission includes", () => {
    expect(
      checkPermissionUses(
        { ...meta, optionalPermissions: ["highlights:write"] },
        findPermissionUses(code("await sb.highlights.list(ref);"))
      )
    ).toEqual({ errors: [], warnings: [] });
  });

  it("warns about a declared permission nothing uses", () => {
    const { errors, warnings } = checkPermissionUses(
      { ...meta, permissions: ["reading:history", "reading:selection"] },
      findPermissionUses(code("const s = sb.reading.selection.value;"))
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([
      expect.stringContaining('asks for "reading:history"'),
    ]);
  });

  it("tells a sandboxed extension from one that runs in the app", () => {
    expect(
      isSandboxedProject(
        code('import { defineExtension } from "seed-bible/extensions";')
      )
    ).toBe(true);
    expect(
      isSandboxedProject(
        code('import { registerExtension } from "seed-bible";')
      )
    ).toBe(false);
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
