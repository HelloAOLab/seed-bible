import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadExtensionProjectInfo } from "../lib/project.js";
import { readIcon, type IconFile } from "../lib/icon.js";
import { runBuild } from "./build.js";
import {
  bootstrapRecordKey,
  createClient,
  uploadFile,
  writePublicData,
  type RecordsClient,
} from "../lib/recordsClient.js";

export interface PublishOptions {
  dryRun: boolean;
}

/**
 * The `ExtensionSet` shape `discoverExtensionSet(url)` (see
 * `packages/seed-bible/seed-bible/managers/ExtensionManager.tsx`) expects.
 * Kept local rather than imported from `seed-bible` — this is plain,
 * JSON-serializable data, not a type this package needs a real dependency on
 * `seed-bible` just to describe.
 */
export interface ExtensionSetManifest {
  id: string;
  extensions: Array<{
    url: string;
    meta: {
      [field: string]: unknown;
      id: string;
      translations: Record<string, { title: string; description: string }>;
      dependencies?: string[];
      autoinstall?: boolean;
      version?: string;
      permissions?: string[];
      optionalPermissions?: string[];
      network?: string[];
      /** The bundle's hash, so Seed Bible runs exactly the uploaded code. */
      integrity?: string;
      /** A link to the extension's icon. */
      icon?: string;
    };
  }>;
}

export async function runPublish(
  options: PublishOptions,
  root: string = process.cwd()
): Promise<number> {
  const buildCode = await runBuild({ standalone: true }, root);
  if (buildCode !== 0) {
    console.error("[publish] Aborting: build failed.");
    return buildCode;
  }

  const info = await loadExtensionProjectInfo(root);

  const bundlePath = path.join(root, "dist", "standalone", "index.js");
  const bundle = await readFile(bundlePath);
  const integrity = `sha384-${createHash("sha384").update(bundle).digest("base64")}`;

  const manifest: ExtensionSetManifest = {
    id: info.extensionId,
    extensions: [
      {
        // Filled in with the real, uploaded bundle URL below once it's known
        // — placeholder here so the manifest shape is visible in --dry-run.
        url: "",
        meta: { ...info.meta, integrity },
      },
    ],
  };

  const icon = await readIcon(root, info.meta);

  if (options.dryRun) {
    console.log(
      `[publish] --dry-run: not uploading. Would publish this ExtensionSet (once the bundle URL${icon ? " and the uploaded icon's link" : ""} below are filled in):`
    );
    console.log(JSON.stringify(manifest, null, 2));
    return 0;
  }

  const client = createClient();
  const recordKey = await resolveRecordKey(client);
  const { setUrl } = await uploadExtensionSet(
    client,
    recordKey,
    manifest,
    new Uint8Array(bundle),
    icon
  );

  console.log(`
[publish] Published '${info.extensionId}'${info.meta.version ? ` ${info.meta.version}` : ""}.

  ${setUrl}

This link stays the same each time you publish, so people who installed from
it get each new version the next time they open Seed Bible.

To install it, paste that link into Seed Bible's Settings > Extensions >
"Add extensions from a link", or share a link that offers to install it:

  https://seedbible.org/?extensionSet=${encodeURIComponent(setUrl)}&autoinstall-${info.extensionId}=true
`);

  return 0;
}

/**
 * Uploads the bundle and icon, each to its own link, fills those links into
 * `manifest`, and writes it where the extension's set lives.
 */
export async function uploadExtensionSet(
  client: RecordsClient,
  recordKey: string,
  manifest: ExtensionSetManifest,
  bundle: Uint8Array<ArrayBuffer>,
  icon: IconFile | null
): Promise<{ setUrl: string; manifest: ExtensionSetManifest }> {
  const extension = manifest.extensions[0]!;

  console.log("[publish] Uploading standalone bundle...");
  const { fileUrl: bundleUrl } = await uploadFile(
    client,
    recordKey,
    bundle,
    ["publicRead"],
    "text/javascript"
  );
  extension.url = bundleUrl;

  if (icon) {
    console.log("[publish] Uploading icon...");
    const { fileUrl: iconUrl } = await uploadFile(
      client,
      recordKey,
      icon.bytes,
      ["publicRead"],
      icon.mimeType
    );
    extension.meta.icon = iconUrl;
  }

  // A file's URL changes with its contents, so the manifest goes in a data
  // record instead: republishing overwrites it, and everyone who installed
  // from its link gets the new version.
  console.log("[publish] Updating extension set manifest...");
  const { dataUrl: setUrl } = await writePublicData(
    client,
    recordKey,
    extensionSetAddress(extension.meta.id),
    manifest
  );
  return { setUrl, manifest };
}

export const extensionSetAddress = (extensionId: string) =>
  `extension-sets/${extensionId}`;

async function resolveRecordKey(
  client: ReturnType<typeof createClient>
): Promise<string> {
  const fromEnv = process.env.SEED_BIBLE_RECORD_KEY;
  if (fromEnv) {
    return fromEnv;
  }

  const recordKey = await bootstrapRecordKey(client);
  console.log(`
[publish] Created a new record key. Save it as SEED_BIBLE_RECORD_KEY so
future publishes don't need to log in again — for example:

  export SEED_BIBLE_RECORD_KEY="${recordKey}"

Treat this like a password: anyone with it can publish files under your
account.
`);
  return recordKey;
}
