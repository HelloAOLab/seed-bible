import * as z from "zod/v4";
import {
  isSandboxPermission,
  SANDBOX_PERMISSION_INFO,
  type SandboxPermission,
} from "../extensions/protocol";
import {
  isValidSensitiveHost,
  normalizeSensitiveHost,
} from "./extensionSettingConstraints";

/**
 * What a sandboxed extension's manifest asks for, once checked. See
 * `parseSandboxManifest`.
 */
export interface SandboxManifest {
  version: string | null;
  /** Approved at install; the extension doesn't install without them. */
  permissions: SandboxPermission[];
  /**
   * Asked for later with `sb.permissions.request`, when the feature that
   * needs one is used. Never overlaps `permissions`.
   */
  optionalPermissions: SandboxPermission[];
  /** Normalized hosts (`api.example.com`, `example.com:8443`). */
  network: string[];
  integrity: string;
}

export type SandboxManifestResult =
  | { ok: true; manifest: SandboxManifest }
  | { ok: false; error: string };

/** `sha256-`, `sha384-` or `sha512-` and a base64 digest, as in HTML's `integrity`. */
const INTEGRITY_PATTERN = /^(sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2}$/;

/**
 * Checks the sandbox fields of an extension's manifest. Strict on purpose:
 * a permission this version doesn't know about fails the install rather than
 * being dropped, since the extension would otherwise run without something
 * it was written to expect, and the user would never have been asked.
 */
export function parseSandboxManifest(meta: {
  version?: unknown;
  permissions?: unknown;
  optionalPermissions?: unknown;
  network?: unknown;
  integrity?: unknown;
  dependencies?: unknown;
}): SandboxManifestResult {
  if (Array.isArray(meta.dependencies) && meta.dependencies.length > 0) {
    return {
      ok: false,
      error: "Sandboxed extensions can't declare dependencies yet.",
    };
  }
  if (
    typeof meta.integrity !== "string" ||
    !INTEGRITY_PATTERN.test(meta.integrity)
  ) {
    return {
      ok: false,
      error:
        'The manifest needs an "integrity" hash for its bundle (e.g. "sha384-…"); `seed-bible-extension-scripts publish` adds it.',
    };
  }
  if (meta.version !== undefined && typeof meta.version !== "string") {
    return { ok: false, error: '"version" must be a string.' };
  }

  const permissions = meta.permissions ?? [];
  const optionalPermissions = meta.optionalPermissions ?? [];
  for (const [field, list] of [
    ["permissions", permissions],
    ["optionalPermissions", optionalPermissions],
  ] as const) {
    if (!Array.isArray(list)) {
      return { ok: false, error: `"${field}" must be an array.` };
    }
    const unknown = list.filter((p) => !isSandboxPermission(p));
    if (unknown.length > 0) {
      return {
        ok: false,
        error: `This version of Seed Bible doesn't support the permission(s): ${unknown.map(String).join(", ")}.`,
      };
    }
  }
  const required = [...new Set(permissions as SandboxPermission[])];
  const optionalOnly = required.filter(
    (p) => !SANDBOX_PERMISSION_INFO[p].requirable
  );
  if (optionalOnly.length > 0) {
    return {
      ok: false,
      error: `These permissions can only be asked for when they're needed, so list them under "optionalPermissions" instead of "permissions": ${optionalOnly.join(", ")}.`,
    };
  }

  const network = meta.network ?? [];
  if (!Array.isArray(network)) {
    return { ok: false, error: '"network" must be an array of hosts.' };
  }
  const invalidHosts = network.filter(
    (host) => typeof host !== "string" || !isValidSensitiveHost(host)
  );
  if (invalidHosts.length > 0) {
    return {
      ok: false,
      error: `Invalid "network" host(s): ${invalidHosts.map(String).join(", ")}. Use a bare host like "api.example.com".`,
    };
  }

  return {
    ok: true,
    manifest: {
      version: meta.version ?? null,
      permissions: required,
      // One listed in both is required: the stricter reading.
      optionalPermissions: [
        ...new Set(optionalPermissions as SandboxPermission[]),
      ].filter((p) => !required.includes(p)),
      network: [
        ...new Set((network as string[]).map((h) => normalizeSensitiveHost(h))),
      ],
      integrity: meta.integrity,
    },
  };
}

/**
 * Where a bundle comes from, for tying a grant to its publisher: the bundle
 * URL without its last path segment. A publisher's new uploads land beside
 * the old ones (CasualOS file records live under the publisher's record), so
 * an update keeps its grant, while a different publisher reusing the same
 * extension id doesn't inherit it.
 */
export function extensionSource(url: string): string {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/[^/]*$/, "/");
  return `${parsed.origin}${path}`;
}

/**
 * The id a third-party extension is known by: its source (see
 * `extensionSource`), `#`, and the id its manifest declares. Everything kept
 * per extension (its storage, its identity, its notes, its grant) is kept
 * under this id, so an extension from somewhere else can never claim another's
 * by declaring the same id. A source never contains `#`, so the first `#`
 * always splits the two. Already-sourced ids are returned as they are.
 */
export function sourcedExtensionId(
  bundleUrl: string,
  declaredId: string
): string {
  const source = extensionSource(bundleUrl);
  return declaredId.startsWith(`${source}#`)
    ? declaredId
    : `${source}#${declaredId}`;
}

/**
 * Splits an id from `sourcedExtensionId` into its source and the id the
 * extension declared. Null for an extension built into the app, which has no
 * source.
 */
export function splitSourcedExtensionId(
  id: string
): { source: string; declaredId: string } | null {
  const separator = id.indexOf("#");
  if (separator < 0) {
    return null;
  }
  const source = id.slice(0, separator);
  try {
    if (extensionSource(source) !== source) {
      return null;
    }
  } catch {
    return null;
  }
  return { source, declaredId: id.slice(separator + 1) };
}

/** What the user agreed to for one sandboxed extension. */
export interface ExtensionGrant {
  permissions: SandboxPermission[];
  network: string[];
  version: string | null;
  source: string;
  grantedAtMs: number;
}

/** Kept after uninstall so another device's older grant doesn't come back. */
export interface RevokedExtensionGrant {
  revokedAtMs: number;
}

export type ExtensionGrantEntry = ExtensionGrant | RevokedExtensionGrant;

export type ExtensionGrants = Record<string, ExtensionGrantEntry>;

const grantSchema = z.object({
  permissions: z
    .array(z.string())
    .transform((list) => list.filter(isSandboxPermission)),
  network: z.array(z.string()),
  version: z.string().nullable(),
  source: z.string(),
  grantedAtMs: z.number(),
});
const revokedSchema = z.object({ revokedAtMs: z.number() });
const grantsSchema = z.record(z.string(), z.unknown());

export function parseExtensionGrants(value: unknown): ExtensionGrants {
  const parsed = grantsSchema.safeParse(value);
  if (!parsed.success) {
    return {};
  }
  const grants: ExtensionGrants = {};
  for (const [id, entry] of Object.entries(parsed.data)) {
    const grant = grantSchema.safeParse(entry);
    if (grant.success) {
      grants[id] = grant.data;
      continue;
    }
    const revoked = revokedSchema.safeParse(entry);
    if (revoked.success) {
      grants[id] = revoked.data;
    }
  }
  return grants;
}

const entryTime = (entry: ExtensionGrantEntry) =>
  "revokedAtMs" in entry ? entry.revokedAtMs : entry.grantedAtMs;

/** Per extension, the most recent grant or revocation wins. */
export function mergeExtensionGrants(
  a: ExtensionGrants,
  b: ExtensionGrants
): ExtensionGrants {
  const merged: ExtensionGrants = { ...a };
  for (const [id, entry] of Object.entries(b)) {
    const existing = merged[id];
    if (!existing || entryTime(entry) > entryTime(existing)) {
      merged[id] = entry;
    }
  }
  return merged;
}

export function activeGrant(
  entry: ExtensionGrantEntry | undefined
): ExtensionGrant | null {
  return entry && !("revokedAtMs" in entry) ? entry : null;
}

/**
 * What `manifest` asks for that `grant` doesn't already allow. Both empty
 * means the extension can load without asking. A grant from a different
 * source covers nothing.
 */
export function missingFromGrant(
  grant: ExtensionGrant | null,
  manifest: SandboxManifest,
  source: string
): { permissions: SandboxPermission[]; network: string[] } {
  if (!grant || grant.source !== source) {
    return { permissions: manifest.permissions, network: manifest.network };
  }
  return {
    permissions: manifest.permissions.filter(
      (p) => !grant.permissions.includes(p)
    ),
    network: manifest.network.filter((h) => !grant.network.includes(h)),
  };
}

/** What the consent dialog shows. */
export interface SandboxConsentRequest {
  extensionId: string;
  title: string;
  description: string;
  /** The host the bundle is served from. */
  sourceHost: string;
  /** Set when the bundle is in Seed Bible's own storage, which says who uploaded it. */
  uploader?: SandboxUploader;
  version: string | null;
  /**
   * Why the user is being asked: to install the extension, to let an update
   * have more than they approved before, or because the extension, while
   * running, asked for some of its optional permissions.
   */
  reason: "install" | "update" | "request";
  /** What it needs: everything required at install, or what it's asking for now. */
  permissions: SandboxPermission[];
  network: string[];
  /** What an earlier grant didn't cover; the same as the above for "install" and "request". */
  newPermissions: SandboxPermission[];
  newNetwork: string[];
  /** What it may ask for later, shown at install so it isn't a surprise. */
  optionalPermissions: SandboxPermission[];
  /** For a "request": what it already has, so the dialog can say what it still can't do. */
  alreadyAllowed?: { permissions: SandboxPermission[]; network: string[] };
}

/** Who uploaded an extension to Seed Bible's storage. */
export interface SandboxUploader {
  userId: string;
  /** Their profile name; null when they haven't set one. */
  name: string | null;
  pictureUrl: string | null;
}

/** Asks the user; resolves true only if they agreed. */
export type SandboxConsentHandler = (
  request: SandboxConsentRequest
) => Promise<boolean>;
