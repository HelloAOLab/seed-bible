import type { ExtensionProjectMeta } from "./project.js";

/**
 * Seed Bible's permission policy, as far as checking a manifest needs it:
 * every permission it knows, and which of them can only be optional. A copy
 * of `SANDBOX_PERMISSION_INFO` in `seed-bible/extensions`, so the check runs
 * without loading the app's code; a test in the seed-bible repository fails
 * if the two ever differ.
 */
export const KNOWN_PERMISSIONS = [
  "reading:position",
  "reading:selection",
  "reading:navigate",
  "reading:history",
  "highlights:read",
  "highlights:write",
  "notes:read",
  "notes:write",
  "saves:read",
  "saves:write",
  "profile:read",
  "chat:respond",
  "chat:shared",
] as const;

export const OPTIONAL_ONLY_PERMISSIONS: readonly string[] = [
  "highlights:write",
  "notes:read",
  "notes:write",
  "saves:write",
  "profile:read",
  "chat:shared",
];

/**
 * What would stop Seed Bible installing this manifest's permissions, as
 * messages for the developer. Empty when there's nothing wrong.
 */
export function checkManifestPermissions(meta: ExtensionProjectMeta): string[] {
  const problems: string[] = [];
  const known = new Set<string>(KNOWN_PERMISSIONS);
  for (const [field, list] of [
    ["permissions", meta.permissions ?? []],
    ["optionalPermissions", meta.optionalPermissions ?? []],
  ] as const) {
    for (const permission of list) {
      if (!known.has(permission)) {
        problems.push(
          `"${field}" lists "${permission}", which Seed Bible doesn't know.`
        );
      }
    }
  }
  for (const permission of meta.permissions ?? []) {
    if (OPTIONAL_ONLY_PERMISSIONS.includes(permission)) {
      problems.push(
        `"${permission}" can only be asked for when it's needed: move it from "permissions" to "optionalPermissions", and call sb.permissions.request("${permission}") from the feature that uses it.`
      );
    }
  }
  return problems;
}
