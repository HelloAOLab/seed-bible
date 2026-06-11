/**
 * Artifact store abstraction for the multi-branch host server.
 *
 * Mirrors the S3 layout described in the deployment plan:
 *   branches/<name>/current.json                  → { buildId, ... }
 *   branches/<name>/<buildId>/server.mjs          → SSR bundle
 *   branches/<name>/<buildId>/client-manifest.json
 *
 * Two backends:
 *  - "local": reads from a directory on disk (dev / CI smoke tests).
 *  - "s3":    reads from an S3 bucket (production). The AWS SDK is imported
 *             lazily so the server runs locally without it installed.
 */
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export interface BranchPointer {
  buildId: string;
  deployedAt?: string;
  commit?: string;
}

export interface BranchArtifacts {
  /** Absolute path to a local copy of the branch's SSR bundle. */
  serverModulePath: string;
  /** Parsed Vite client manifest for the build. */
  manifest: Record<string, unknown>;
}

export interface ArtifactStore {
  /** Reads the live pointer for a branch, or null if it does not exist. */
  readPointer(branch: string): Promise<BranchPointer | null>;
  /** Materializes a build's SSR bundle (to a local file) + manifest. */
  fetchArtifacts(branch: string, buildId: string): Promise<BranchArtifacts>;
}

const tmpRoot = path.join(os.tmpdir(), "seedbible-bundles");

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ─── Local filesystem backend ────────────────────────────────────────────────

class LocalStore implements ArtifactStore {
  readonly dir: string;
  constructor(dir: string) {
    this.dir = dir;
  }

  async readPointer(branch: string): Promise<BranchPointer | null> {
    const p = path.join(this.dir, "branches", branch, "current.json");
    if (!(await exists(p))) return null;
    return JSON.parse(await readFile(p, "utf8")) as BranchPointer;
  }

  async fetchArtifacts(
    branch: string,
    buildId: string
  ): Promise<BranchArtifacts> {
    const base = path.join(this.dir, "branches", branch, buildId);
    const manifest = JSON.parse(
      await readFile(path.join(base, "client-manifest.json"), "utf8")
    );
    // Local bundles are already on disk; import them in place.
    return {
      serverModulePath: path.join(base, "server.mjs"),
      manifest,
    };
  }
}

// ─── S3 backend ──────────────────────────────────────────────────────────────

class S3Store implements ArtifactStore {
  readonly bucket: string;
  private client: unknown;
  private GetObjectCommand!: new (input: unknown) => unknown;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  private async ensureClient() {
    if (this.client) return;
    // Lazy import so local runs don't require the AWS SDK to be installed.
    const { S3Client, GetObjectCommand } = await import(
      "@aws-sdk/client-s3" as string
    );
    this.client = new S3Client({});
    this.GetObjectCommand = GetObjectCommand as never;
  }

  private async getObject(key: string): Promise<Buffer | null> {
    await this.ensureClient();
    try {
      const res = (await (
        this.client as { send: (c: unknown) => Promise<unknown> }
      ).send(new this.GetObjectCommand({ Bucket: this.bucket, Key: key }))) as {
        Body: { transformToByteArray: () => Promise<Uint8Array> };
      };
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") return null;
      throw err;
    }
  }

  async readPointer(branch: string): Promise<BranchPointer | null> {
    const buf = await this.getObject(`branches/${branch}/current.json`);
    return buf ? (JSON.parse(buf.toString("utf8")) as BranchPointer) : null;
  }

  async fetchArtifacts(
    branch: string,
    buildId: string
  ): Promise<BranchArtifacts> {
    const prefix = `branches/${branch}/${buildId}`;
    const [serverBuf, manifestBuf] = await Promise.all([
      this.getObject(`${prefix}/server.mjs`),
      this.getObject(`${prefix}/client-manifest.json`),
    ]);
    if (!serverBuf || !manifestBuf) {
      throw new Error(`Missing artifacts for ${branch}@${buildId}`);
    }
    // Node cannot import an ESM module from a buffer; stage it on disk
    // (once per buildId) and import the file. Filename includes the buildId
    // so distinct builds never collide.
    await mkdir(tmpRoot, { recursive: true });
    const localPath = path.join(tmpRoot, `${branch}__${buildId}.mjs`);
    if (!(await exists(localPath))) {
      await writeFile(localPath, serverBuf);
    }
    return {
      serverModulePath: localPath,
      manifest: JSON.parse(manifestBuf.toString("utf8")),
    };
  }
}

export function createStore(): ArtifactStore {
  const backend = process.env.STORE_BACKEND ?? "local";
  if (backend === "s3") {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET is required when STORE_BACKEND=s3");
    return new S3Store(bucket);
  }
  const dir = process.env.STORE_DIR ?? path.resolve("dist/.deploy-store");
  return new LocalStore(dir);
}
