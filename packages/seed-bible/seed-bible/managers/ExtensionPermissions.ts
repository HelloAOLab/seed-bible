import * as z from "zod/v4";
import {
  isSandboxPermission,
  type SandboxPermission,
} from "../sandbox/protocol";
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
  permissions: SandboxPermission[];
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
  if (!Array.isArray(permissions)) {
    return { ok: false, error: '"permissions" must be an array.' };
  }
  const unknown = permissions.filter((p) => !isSandboxPermission(p));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `This version of Seed Bible doesn't support the permission(s): ${unknown.map(String).join(", ")}.`,
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
      permissions: [...new Set(permissions as SandboxPermission[])],
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
  version: string | null;
  permissions: SandboxPermission[];
  network: string[];
  /** True when an earlier grant exists and this asks for more. */
  isUpdate: boolean;
  /** What the earlier grant didn't cover; everything when there was none. */
  newPermissions: SandboxPermission[];
  newNetwork: string[];
}

/** Asks the user; resolves true only if they agreed. */
export type SandboxConsentHandler = (
  request: SandboxConsentRequest
) => Promise<boolean>;
