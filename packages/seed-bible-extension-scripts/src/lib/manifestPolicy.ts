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
  "friends:read",
  "session:read",
  "audio:playback",
  "clipboard:write",
  "embed:casualos",
  "device:microphone",
  "device:camera",
] as const;

export const OPTIONAL_ONLY_PERMISSIONS: readonly string[] = [
  "highlights:write",
  "notes:read",
  "notes:write",
  "saves:write",
  "profile:read",
  "chat:shared",
  "friends:read",
  "session:read",
  "device:microphone",
  "device:camera",
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

/** Granting a key also grants these. A copy of `implies` in the same policy. */
export const IMPLIED_PERMISSIONS: Readonly<Record<string, readonly string[]>> =
  {
    "highlights:write": ["highlights:read"],
    "notes:write": ["notes:read"],
    "saves:write": ["saves:read"],
    "chat:shared": ["chat:respond"],
  };

/**
 * The permission each part of `sb` needs, by its path under `sb`. A copy of
 * `SANDBOX_METHOD_PERMISSIONS` (and the state those permissions gate) in
 * the words an extension's code uses; a test in the seed-bible repository
 * keeps the two in step.
 */
export const SDK_PERMISSIONS: Readonly<Record<string, string>> = {
  "reading.position": "reading:position",
  "reading.selection": "reading:selection",
  "reading.open": "reading:navigate",
  "history.list": "reading:history",
  "highlights.list": "highlights:read",
  "highlights.add": "highlights:write",
  "highlights.remove": "highlights:write",
  "notes.list": "notes:read",
  "notes.create": "notes:write",
  "notes.update": "notes:write",
  "notes.delete": "notes:write",
  "saves.list": "saves:read",
  "saves.add": "saves:write",
  "saves.remove": "saves:write",
  "profile.get": "profile:read",
  "discover.registerProvider": "reading:position",
  "chats.registerProvider": "chat:respond",
  "friends.list": "friends:read",
  "session.current": "session:read",
  "audio.play": "audio:playback",
  "audio.playNarration": "audio:playback",
  "audio.narrators": "audio:playback",
  "audio.readAloud": "audio:playback",
  "audio.pause": "audio:playback",
  "audio.resume": "audio:playback",
  "audio.seek": "audio:playback",
  "audio.stop": "audio:playback",
  "audio.playback": "audio:playback",
  "clipboard.writeText": "clipboard:write",
  "portals.open": "embed:casualos",
  "devices.recordAudio": "device:microphone",
  "devices.takePhoto": "device:camera",
};

const SDK_USE = new RegExp(
  `\\.(${Object.keys(SDK_PERMISSIONS)
    .map((key) => key.replace(".", "\\."))
    .join("|")})\\b`,
  "g"
);

export interface PermissionUse {
  /** Where under `sb`, e.g. `highlights.add`. */
  api: string;
  permission: string;
  /** `file:line`. */
  at: string;
}

/**
 * Finds the parts of `sb` an extension's code uses that need a permission.
 * It reads the code as text, so it sees `sb.highlights.add(` (or
 * `context.highlights.add(`) but not calls reached some other way.
 */
export function findPermissionUses(
  sources: { path: string; text: string }[]
): PermissionUse[] {
  const uses: PermissionUse[] = [];
  for (const file of sources) {
    const lines = file.text.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(SDK_USE)) {
        const api = match[1]!;
        uses.push({
          api,
          permission: SDK_PERMISSIONS[api]!,
          at: `${file.path}:${index + 1}`,
        });
      }
    });
  }
  return uses;
}

/**
 * Compares what the code uses with what the manifest declares. A use with
 * no declaration would always be refused, so it's an error; a declared
 * permission nothing uses only lengthens the install prompt, so it's a
 * warning.
 */
export function checkPermissionUses(
  meta: ExtensionProjectMeta,
  uses: PermissionUse[]
): { errors: string[]; warnings: string[] } {
  const declared = [
    ...(meta.permissions ?? []),
    ...(meta.optionalPermissions ?? []),
  ];
  const covered = new Set([
    ...declared,
    ...declared.flatMap((p) => IMPLIED_PERMISSIONS[p] ?? []),
  ]);
  const errors: string[] = [];
  const reported = new Set<string>();
  for (const use of uses) {
    if (covered.has(use.permission) || reported.has(use.permission)) {
      continue;
    }
    reported.add(use.permission);
    const field = OPTIONAL_ONLY_PERMISSIONS.includes(use.permission)
      ? '"optionalPermissions"'
      : '"permissions" (or "optionalPermissions", and ask for it with sb.permissions.request)';
    errors.push(
      `${use.at} uses sb.${use.api}, which needs "${use.permission}". Add it to ${field} in extension.json, or Seed Bible will refuse it.`
    );
  }
  const used = new Set(uses.map((use) => use.permission));
  const warnings = declared
    .filter(
      (p) =>
        !used.has(p) && !(IMPLIED_PERMISSIONS[p] ?? []).some((i) => used.has(i))
    )
    .map(
      (p) =>
        `extension.json asks for "${p}", but nothing in the code seems to use it. Every permission listed makes the install prompt longer; remove it if it isn't needed.`
    );
  return { errors, warnings };
}
