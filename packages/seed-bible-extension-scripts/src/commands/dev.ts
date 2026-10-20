import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { build as viteBuild, type Rollup } from "vite";
import { loadExtensionProjectInfo } from "../lib/project.js";
import {
  isSandboxedProject,
  readProjectSources,
} from "../lib/sandboxedProject.js";
import { standaloneBundleConfig } from "../lib/standaloneBundle.js";
import {
  startDevExtensionServer,
  type DevExtensionServer,
} from "../lib/devExtensionServer.js";
import { runCommand } from "../lib/spawn.js";
import {
  pickReleaseTag,
  readSeedBibleDependencySpec,
  refDirName,
  resolveSeedBibleTarget,
  type SeedBibleTarget,
} from "../lib/seedBibleTarget.js";

const execFileAsync = promisify(execFile);

export interface DevOptions {
  /** Path to an existing seed-bible checkout to use instead of the managed cache. */
  repoPath?: string;
  /** Release range (e.g. `1.13`) or branch (e.g. `develop`) to run instead of the one package.json implies. */
  seedBibleVersion?: string;
  /** Port to run the seed-bible dev server on. Defaults to 3002 (its own default). */
  port?: number;
  /** Port to serve a sandboxed extension's bundle on. Defaults to 5174. */
  extensionPort?: number;
}

const REPO_URL = "https://github.com/HelloAOLab/seed-bible.git";
const DEFAULT_PORT = 3002;
const DEFAULT_EXTENSION_PORT = 5174;

/**
 * OS-appropriate cache root for the managed seed-bible checkouts, following
 * the same `XDG_CACHE_HOME` / `%LOCALAPPDATA%` / `~/.cache` convention most
 * CLI tools use, so `dev` needs no configuration to "just work" the first
 * time it runs.
 */
function defaultCacheDir(): string {
  const base =
    process.env.XDG_CACHE_HOME ||
    (process.platform === "win32" ? process.env.LOCALAPPDATA : undefined) ||
    path.join(os.homedir(), ".cache");
  return path.join(base, "seed-bible-extension-dev");
}

function isSeedBibleCheckout(dir: string): boolean {
  return existsSync(path.join(dir, "pnpm-workspace.yaml"));
}

/** The repo's release tags, or `undefined` if the remote can't be reached. */
async function listRemoteTags(): Promise<string[] | undefined> {
  try {
    const { stdout } = await execFileAsync("git", [
      "ls-remote",
      "--tags",
      "--refs",
      REPO_URL,
    ]);
    return stdout
      .split("\n")
      .map((line) => line.split("\t")[1]?.replace("refs/tags/", ""))
      .filter((tag): tag is string => Boolean(tag));
  } catch {
    return undefined;
  }
}

/** Release tags already cloned into the cache, for working offline. */
async function listCachedTags(releasesDir: string): Promise<string[]> {
  if (!existsSync(releasesDir)) {
    return [];
  }
  const entries = await readdir(releasesDir, { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isDirectory() && isSeedBibleCheckout(path.join(releasesDir, e.name))
    )
    .map((e) => e.name);
}

async function cloneRef(ref: string, dir: string): Promise<void> {
  await mkdir(path.dirname(dir), { recursive: true });
  console.log(`[dev] Cloning seed-bible ${ref} into ${dir} (first run only)…`);
  const code = await runCommand(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "--branch",
      ref,
      "--single-branch",
      REPO_URL,
      dir,
    ],
    { cwd: path.dirname(dir) }
  );
  if (code !== 0) {
    throw new Error(
      `git clone of seed-bible ${ref} failed (exit ${code}). Pass --repo <path> to use an existing checkout instead.`
    );
  }
}

async function installDependencies(dir: string): Promise<void> {
  console.log("[dev] Installing dependencies (pnpm install)…");
  const code = await runCommand("pnpm", ["install"], { cwd: dir });
  if (code !== 0) {
    throw new Error(`pnpm install failed (exit ${code}) in ${dir}.`);
  }
}

/** A cached checkout of the newest release tag satisfying `range`. */
async function ensureRelease(range: string | undefined): Promise<string> {
  const releasesDir = path.join(defaultCacheDir(), "releases");
  let tags = await listRemoteTags();
  if (!tags) {
    console.warn(
      "[dev] Couldn't reach GitHub to list seed-bible releases; choosing from the ones already cached."
    );
    tags = await listCachedTags(releasesDir);
  }
  const tag = pickReleaseTag(tags, range);
  if (!tag) {
    throw new Error(
      range
        ? `No seed-bible release matches "${range}". Change the "seed-bible" version in package.json, or pass --seed-bible-version <version|branch>.`
        : "Couldn't find any seed-bible release. Pass --repo <path> or --seed-bible-version <branch>."
    );
  }

  const dir = path.join(releasesDir, refDirName(tag));
  // Tags don't move, so an existing checkout never needs a pull.
  if (!isSeedBibleCheckout(dir)) {
    await cloneRef(tag, dir);
  }
  return dir;
}

/** A cached checkout of `branch`, updated to its latest commit on each run. */
async function ensureBranch(branch: string): Promise<string> {
  const dir = path.join(defaultCacheDir(), "branches", refDirName(branch));
  if (!isSeedBibleCheckout(dir)) {
    await cloneRef(branch, dir);
  } else {
    console.log(`[dev] Updating cached seed-bible ${branch}…`);
    const code = await runCommand("git", ["pull", "--ff-only"], { cwd: dir });
    if (code !== 0) {
      console.warn(
        `[dev] git pull failed — continuing with the cached ${branch} as-is.`
      );
    }
  }
  return dir;
}

async function ensureTarget(target: SeedBibleTarget): Promise<string> {
  switch (target.kind) {
    case "checkout":
      if (!isSeedBibleCheckout(target.dir)) {
        throw new Error(
          `${target.dir} doesn't look like a seed-bible checkout (no pnpm-workspace.yaml found).`
        );
      }
      return target.dir;
    case "release":
      return ensureRelease(target.range);
    case "branch":
      return ensureBranch(target.branch);
  }
}

/**
 * Seed Bible versions from before out-of-tree extension support would start
 * fine but silently leave the extension out, so check for it up front.
 */
async function assertSupportsExternalExtensions(appDir: string): Promise<void> {
  const pluginPath = path.join(
    appDir,
    "script",
    "lib",
    "vite-plugin-extensions.ts"
  );
  const source = existsSync(pluginPath)
    ? await readFile(pluginPath, "utf-8")
    : "";
  if (!source.includes("SEED_BIBLE_EXTRA_EXTENSION_DIRS")) {
    throw new Error(
      `The seed-bible version at ${appDir} doesn't support loading extensions from outside its own repo, so this extension wouldn't appear. Use a newer version (raise "seed-bible" in package.json, or pass --seed-bible-version develop), or --repo <path> to a checkout that has it.`
    );
  }
}

/**
 * A sandboxed extension is offered to the app through `?extensionSet=`,
 * which older versions ignore, leaving nothing to install.
 */
async function assertSupportsExtensionSetLinks(appDir: string): Promise<void> {
  const managerPath = path.join(
    appDir,
    "packages",
    "seed-bible",
    "seed-bible",
    "managers",
    "ExtensionManager.tsx"
  );
  const source = existsSync(managerPath)
    ? await readFile(managerPath, "utf-8")
    : "";
  if (!source.includes('searchParams.get("extensionSet")')) {
    throw new Error(
      `The seed-bible version at ${appDir} can't install a sandboxed extension from a link, so this extension wouldn't appear. Use a newer version (raise "seed-bible" in package.json, or pass --seed-bible-version develop), or --repo <path> to a checkout that has it.`
    );
  }
}

/**
 * Builds the sandboxed bundle and keeps rebuilding it as files change,
 * serving it with an always-current `ExtensionSet`.
 */
async function startSandboxedExtension(
  root: string,
  port: number
): Promise<{ server: DevExtensionServer; stop: () => Promise<void> }> {
  const outDir = path.join(root, "dist", "dev");
  const config = standaloneBundleConfig(root, outDir, "development");
  const watcher = (await viteBuild({
    ...config,
    build: { ...config.build, watch: {} },
  })) as Rollup.RollupWatcher;
  await new Promise<void>((resolve, reject) => {
    watcher.on("event", (event) => {
      if (event.code === "END") {
        console.log(
          "[dev] Extension built. Reload Seed Bible to run the latest version."
        );
        resolve();
      } else if (event.code === "ERROR") {
        console.error("[dev] Extension build failed:", event.error.message);
        // Only the first build stops `dev`; later ones wait for a fix.
        reject(event.error);
      }
    });
  });
  const server = await startDevExtensionServer({
    root,
    bundlePath: path.join(outDir, "index.js"),
    port,
  });
  console.log(`[dev] Serving the extension at ${server.setUrl}`);
  return {
    server,
    stop: async () => {
      await watcher.close();
      await server.close();
    },
  };
}

async function readDependencySpec(root: string): Promise<string | undefined> {
  const raw = await readFile(path.join(root, "package.json"), "utf-8");
  return readSeedBibleDependencySpec(JSON.parse(raw));
}

async function waitForServer(url: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      // Any response at all (even a 4xx/5xx from the app itself) means the
      // server is up and listening — that's all this needs to know.
      if (response) {
        return;
      }
    } catch {
      // Not up yet — connection refused. Keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for the dev server at ${url}`);
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const command =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "start"
        : "xdg-open";
  const warn = (err: unknown) =>
    console.warn(
      `[dev] Couldn't open a browser (${String(err)}). Open ${url} yourself.`
    );
  try {
    // A missing opener (no xdg-open, say) is reported as an event, which
    // would otherwise crash `dev`.
    const opener = spawn(command, [url], {
      shell: platform === "win32",
      stdio: "ignore",
      detached: true,
    });
    opener.on("error", warn);
    opener.unref();
  } catch (err) {
    warn(err);
  }
}

/**
 * Runs a real Seed Bible dev server with this extension auto-installed.
 *
 * This is the whole point of the toolkit's `dev` command: rather than the
 * broken "load an extension from an arbitrary URL" path (see
 * `docs/developer-guide.md`), it gets the extension into the *same* Vite
 * module graph as a real running app — via `SEED_BIBLE_EXTRA_EXTENSION_DIRS`
 * (a small, additive patch to `script/lib/vite-plugin-extensions.ts` in the
 * seed-bible repo itself) — and then reuses the app's existing
 * `?autoinstall-<id>=true` query-param mechanism to install it for this
 * session, with no new runtime UI required.
 */
export async function runDev(
  options: DevOptions,
  root: string = process.cwd()
): Promise<number> {
  // Vite's build sets NODE_ENV in this process; Seed Bible's server must
  // get the environment as it was, or it starts in production mode.
  const env = { ...process.env };
  const info = await loadExtensionProjectInfo(root);
  const sandboxed = isSandboxedProject(await readProjectSources(root));
  const target = resolveSeedBibleTarget({
    repoOption: options.repoPath,
    versionOption: options.seedBibleVersion,
    dependencySpec: await readDependencySpec(root),
    projectRoot: root,
  });
  const targetLabel =
    target.kind === "checkout"
      ? target.dir
      : target.kind === "branch"
        ? `branch ${target.branch}`
        : `newest release matching ${target.range ?? "any version"}`;
  console.log(`[dev] Using seed-bible ${targetLabel} (from ${target.reason}).`);
  const appDir = await ensureTarget(target);
  // Checked before installing: an unsupported version would otherwise cost a
  // full `pnpm install` before failing.
  if (sandboxed) {
    await assertSupportsExtensionSetLinks(appDir);
  } else {
    await assertSupportsExternalExtensions(appDir);
  }
  if (target.kind !== "checkout") {
    await installDependencies(appDir);
  }
  const port = options.port ?? DEFAULT_PORT;
  // A sandboxed extension runs as it will for users: loaded from a URL into
  // its own frame, not bundled into the app.
  const sandbox = sandboxed
    ? await startSandboxedExtension(
        root,
        options.extensionPort ?? DEFAULT_EXTENSION_PORT
      )
    : null;

  console.log(`[dev] Starting Seed Bible dev server from ${appDir} …`);
  // Windows needs the shell to run `pnpm` (a `.cmd` shim): Node refuses to
  // spawn `.cmd`/`.bat` files directly (CVE-2024-27980) and throws EINVAL.
  const devProcess = spawn("pnpm", ["dev"], {
    cwd: appDir,
    env: {
      ...env,
      PORT: String(port),
      ...(sandbox ? {} : { SEED_BIBLE_EXTRA_EXTENSION_DIRS: root }),
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const baseUrl = `http://localhost:${port}/`;
  const autoinstall = `autoinstall-${encodeURIComponent(info.extensionId)}=true`;
  const installUrl = sandbox
    ? `${baseUrl}?extensionSet=${encodeURIComponent(sandbox.server.setUrl)}&${autoinstall}`
    : `${baseUrl}?${autoinstall}`;

  waitForServer(baseUrl)
    .then(() => {
      console.log(`[dev] Ready — opening ${installUrl}`);
      openBrowser(installUrl);
    })
    .catch((err: unknown) => {
      console.warn(
        `[dev] ${err instanceof Error ? err.message : String(err)} — open ${installUrl} manually once it's ready.`
      );
    });

  const code = await new Promise<number>((resolve) => {
    devProcess.on("exit", (exitCode) => resolve(exitCode ?? 0));
    devProcess.on("error", (err) => {
      console.error("[dev] Failed to start the seed-bible dev server:", err);
      resolve(1);
    });
  });
  await sandbox?.stop();
  return code;
}
