import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { loadExtensionProjectInfo } from "../lib/project.js";
import { runCommand } from "../lib/spawn.js";

export interface DevOptions {
  /** Path to an existing seed-bible checkout to use instead of the managed cache. */
  repoPath?: string;
  /** Port to run the seed-bible dev server on. Defaults to 3002 (its own default). */
  port?: number;
}

const REPO_URL = "https://github.com/HelloAOLab/seed-bible.git";
const DEFAULT_PORT = 3002;

/**
 * OS-appropriate cache root for the managed seed-bible checkout, following
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

/**
 * Resolves a working local seed-bible checkout: `options.repoPath` if given
 * (must already exist), otherwise a cached clone under `defaultCacheDir()`,
 * cloned on first use and best-effort `git pull`ed on later runs. A failed
 * pull only warns (the cached checkout might be offline-usable, or the
 * remote could be temporarily unreachable) — it never blocks `dev` from
 * using whatever's already there.
 */
async function ensureRepo(repoPath: string | undefined): Promise<string> {
  if (repoPath) {
    const resolved = path.resolve(repoPath);
    if (!isSeedBibleCheckout(resolved)) {
      throw new Error(
        `${resolved} doesn't look like a seed-bible checkout (no pnpm-workspace.yaml found).`
      );
    }
    return resolved;
  }

  const cacheDir = defaultCacheDir();
  const appDir = path.join(cacheDir, "app");

  if (!isSeedBibleCheckout(appDir)) {
    console.log(`[dev] Cloning seed-bible into ${appDir} (first run only)…`);
    await mkdir(cacheDir, { recursive: true });
    const cloneCode = await runCommand(
      "git",
      ["clone", "--depth", "1", REPO_URL, appDir],
      { cwd: cacheDir }
    );
    if (cloneCode !== 0) {
      throw new Error(
        `git clone failed (exit ${cloneCode}). Pass --repo <path> to use an existing checkout instead.`
      );
    }
  } else {
    console.log("[dev] Updating cached seed-bible checkout…");
    const pullCode = await runCommand("git", ["pull", "--ff-only"], {
      cwd: appDir,
    });
    if (pullCode !== 0) {
      console.warn(
        "[dev] git pull failed — continuing with the cached checkout as-is."
      );
    }
  }

  console.log("[dev] Installing dependencies (pnpm install)…");
  const installCode = await runCommand("pnpm", ["install"], { cwd: appDir });
  if (installCode !== 0) {
    throw new Error(
      `pnpm install failed (exit ${installCode}) in the cached seed-bible checkout at ${appDir}.`
    );
  }

  return appDir;
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
  try {
    spawn(command, [url], {
      shell: platform === "win32",
      stdio: "ignore",
      detached: true,
    }).unref();
  } catch (err) {
    console.warn(`[dev] Could not auto-open a browser (${String(err)}).`);
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
  const info = await loadExtensionProjectInfo(root);
  const appDir = await ensureRepo(options.repoPath);
  const port = options.port ?? DEFAULT_PORT;

  console.log(`[dev] Starting Seed Bible dev server from ${appDir} …`);
  const devProcess = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["dev"],
    {
      cwd: appDir,
      env: {
        ...process.env,
        PORT: String(port),
        SEED_BIBLE_EXTRA_EXTENSION_DIRS: root,
      },
      stdio: "inherit",
    }
  );

  const baseUrl = `http://localhost:${port}/`;
  const installUrl = `${baseUrl}?autoinstall-${encodeURIComponent(info.extensionId)}=true`;

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

  return new Promise((resolve) => {
    devProcess.on("exit", (code) => resolve(code ?? 0));
    devProcess.on("error", (err) => {
      console.error("[dev] Failed to start the seed-bible dev server:", err);
      resolve(1);
    });
  });
}
