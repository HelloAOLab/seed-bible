import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadExtensionProjectInfo } from "../lib/project.js";
import { runBuild } from "./build.js";
import {
  bootstrapRecordKey,
  createClient,
  uploadFile,
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
interface ExtensionSetManifest {
  id: string;
  extensions: Array<{
    url: string;
    meta: {
      id: string;
      translations: Record<string, { title: string; description: string }>;
      dependencies?: string[];
      autoinstall?: boolean;
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

  const manifest: ExtensionSetManifest = {
    id: info.extensionId,
    extensions: [
      {
        // Filled in with the real, uploaded bundle URL below once it's known
        // — placeholder here so the manifest shape is visible in --dry-run.
        url: "",
        meta: info.meta,
      },
    ],
  };

  if (options.dryRun) {
    console.log(
      "[publish] --dry-run: not uploading. Would publish this ExtensionSet (once the bundle URL below is filled in):"
    );
    console.log(JSON.stringify(manifest, null, 2));
    return 0;
  }

  const client = createClient();
  const recordKey = await resolveRecordKey(client);

  const bundlePath = path.join(root, "dist", "standalone", "index.js");
  const bundle = await readFile(bundlePath);

  console.log("[publish] Uploading standalone bundle...");
  const { fileUrl: bundleUrl } = await uploadFile(
    client,
    recordKey,
    new Uint8Array(bundle),
    ["publicRead"],
    "text/javascript"
  );

  manifest.extensions[0]!.url = bundleUrl;

  console.log("[publish] Uploading extension set manifest...");
  const { fileUrl: setUrl } = await uploadFile(client, recordKey, manifest, [
    "publicRead",
  ]);

  console.log(`
[publish] Published '${info.extensionId}'.

  ${setUrl}

Anyone can now make this extension discoverable by calling:

  context.extensions.discoverExtensionSet("${setUrl}")
`);

  return 0;
}

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
