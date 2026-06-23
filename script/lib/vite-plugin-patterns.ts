import type { Plugin, ViteDevServer } from "vite";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// Virtual module convention: `virtual:@pattern/<folder>` resolves to a module
// whose default export is `{ aux: "<stringified JSON of pattern-dist/<folder>.aux>" }`.
// The `\0` prefix on the resolved id is the Rollup convention that tells other
// plugins to leave the id alone.
const PREFIX = "virtual:@pattern/";
const RESOLVED_PREFIX = "\0" + PREFIX;

const patternsDir = path.resolve("patterns");
const distDir = path.resolve("pattern-dist");

function auxPath(folder: string): string {
  return path.resolve(distDir, `${folder}.aux`);
}

/**
 * Vite plugin that watches the `patterns/` directory, repackages a pattern
 * (via `pnpm pattern package <folder>`) whenever its source changes, and
 * exposes each packaged `.aux` as a `virtual:@pattern/<folder>` module.
 */
export function patternPlugin(): Plugin {
  // Dedupe concurrent packaging runs per folder. A change that arrives while a
  // build is in flight reuses the same promise so a burst of file events maps
  // to a single rebuild.
  const inFlight = new Map<string, Promise<void>>();
  // In build mode, only package each folder once per run.
  const packagedThisRun = new Set<string>();
  let isBuild = false;

  function packagePattern(folder: string): Promise<void> {
    const existing = inFlight.get(folder);
    if (existing) {
      return existing;
    }

    const run = new Promise<void>((resolve, reject) => {
      // `shell: true` so the `pnpm` PATH lookup works on Windows (pnpm.cmd).
      const child = spawn("pnpm", ["pattern", "package", folder], {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true,
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`pnpm pattern package ${folder} exited with code ${code}`)
          );
        }
      });
    }).finally(() => {
      inFlight.delete(folder);
    });

    inFlight.set(folder, run);
    return run;
  }

  // Derive the top-level pattern folder from a changed file path, or null if
  // the file is not inside `patterns/`.
  function folderForFile(file: string): string | null {
    const rel = path.relative(patternsDir, path.resolve(file));
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return null;
    }
    const segment = rel.split(/[\\/]/)[0];
    return segment || null;
  }

  return {
    name: "vite-plugin-patterns",

    configResolved(config) {
      isBuild = config.command === "build";
    },

    resolveId(id) {
      if (id.startsWith(PREFIX)) {
        return "\0" + id;
      }
      return null;
    },

    async load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) {
        return null;
      }
      const folder = id.slice(RESOLVED_PREFIX.length);
      const file = auxPath(folder);

      // In build, always (re)package once so the bundle reflects current source.
      // In dev, the watcher keeps the output fresh; only package on demand if
      // it's missing.
      if (isBuild) {
        if (!packagedThisRun.has(folder)) {
          await packagePattern(folder);
          packagedThisRun.add(folder);
        }
      } else if (!existsSync(file)) {
        await packagePattern(folder);
      }

      const auxText = await readFile(file, "utf-8");
      // Fail fast on corrupt output rather than shipping invalid JSON.
      JSON.parse(auxText);

      // Track the output so build mode rebuilds when it changes.
      this.addWatchFile(file);

      return `export default { aux: ${JSON.stringify(auxText)} };`;
    },

    configureServer(server: ViteDevServer) {
      // patterns/ is under the project root so it's likely already watched;
      // add it explicitly to be safe.
      server.watcher.add(patternsDir);

      const debounce = new Map<string, NodeJS.Timeout>();

      const handle = (file: string) => {
        const folder = folderForFile(file);
        if (!folder) {
          // Not under patterns/ (this naturally excludes pattern-dist/ output,
          // avoiding a rebuild loop).
          return;
        }

        const pending = debounce.get(folder);
        if (pending) {
          clearTimeout(pending);
        }
        debounce.set(
          folder,
          setTimeout(() => {
            debounce.delete(folder);
            server.config.logger.info(`[patterns] repackaging ${folder}…`);
            packagePattern(folder)
              .then(() => {
                const mod = server.moduleGraph.getModuleById(
                  RESOLVED_PREFIX + folder
                );
                if (mod) {
                  server.moduleGraph.invalidateModule(mod);
                }
                // Consumers load a whole CasualOS aux, so do a full reload.
                server.ws.send({ type: "full-reload" });
                server.config.logger.info(`[patterns] packaged ${folder}`);
              })
              .catch((err) => {
                server.config.logger.error(
                  `[patterns] failed to package ${folder}: ${err}`
                );
              });
          }, 150)
        );
      };

      server.watcher.on("add", handle);
      server.watcher.on("change", handle);
      server.watcher.on("unlink", handle);
    },
  };
}
