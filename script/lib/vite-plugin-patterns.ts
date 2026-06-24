import type { Plugin, ViteDevServer } from "vite";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// Virtual module convention: `virtual:@pattern/<folder>` resolves to a module
// whose default export is `{ aux: "<url>" }`.
//
// In dev the `<url>` points at this plugin's HTTP endpoint (served over
// localhost with CORS, see SERVE_PREFIX below) so the cross-origin `ao.bot`
// iframe can fetch the AUX rather than receiving it inline. In build there is
// no localhost server to hit, so the AUX JSON is inlined as the `aux` value
// instead.
//
// The `\0` prefix on the resolved id is the Rollup convention that tells other
// plugins to leave the id alone.
const PREFIX = "virtual:@pattern/";
const RESOLVED_PREFIX = "\0" + PREFIX;

// HTTP path under which packaged AUXes are served in dev, e.g.
// `/@pattern-aux/geo-importer.aux`.
const SERVE_PREFIX = "/@pattern-aux/";

const patternsDir = path.resolve("patterns");
const distDir = path.resolve("pattern-dist");

function auxPath(folder: string): string {
  return path.resolve(distDir, `${folder}.aux`);
}

// Absolute URL (matching the dev server's host/port — see server/index.ts) at
// which the given pattern's AUX is served. It must be absolute because the
// `ao.bot` iframe that consumes it lives on a different origin.
function auxUrl(folder: string): string {
  const port = Number(process.env.PORT ?? 3002);
  return `http://localhost:${port}${SERVE_PREFIX}${encodeURIComponent(
    folder
  )}.aux`;
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

      if (isBuild) {
        // Build: there is no localhost server to serve the AUX from, so inline
        // the JSON. Always (re)package once so the bundle reflects current
        // source.
        if (!packagedThisRun.has(folder)) {
          await packagePattern(folder);
          packagedThisRun.add(folder);
        }

        // Track the output so build mode rebuilds when it changes.
        this.addWatchFile(file);

        return `export default { name: ${JSON.stringify(folder)} };`;
      }

      // Dev: serve the AUX over HTTP (see configureServer) and export its URL.
      // The watcher keeps the output fresh; only package on demand if it's
      // missing so the endpoint has something to serve on first request.
      if (!existsSync(file)) {
        await packagePattern(folder);
      }

      // Track the output so the module reloads if the file is removed/changed.
      this.addWatchFile(file);

      return `export default { aux: ${JSON.stringify(auxUrl(folder))} };`;
    },

    configureServer(server: ViteDevServer) {
      // Serve packaged AUXes over HTTP so the cross-origin `ao.bot` iframe can
      // fetch them. CORS is wide open and the file is read fresh on every
      // request (the data is not sensitive and this only runs in dev).
      server.middlewares.use(SERVE_PREFIX, async (req, res) => {
        // Connect strips SERVE_PREFIX from req.url for mounted middleware, so
        // what remains is `/<folder>.aux` (plus any query string).
        const rest = (req.url ?? "").replace(/^\//, "").split("?")[0] ?? "";

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "*");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        const folder = decodeURIComponent(rest.replace(/\.aux$/, ""));
        const file = auxPath(folder);

        // Guard against path traversal: the resolved file must stay inside
        // pattern-dist/.
        const relToDist = path.relative(distDir, file);
        if (
          !folder ||
          relToDist.startsWith("..") ||
          path.isAbsolute(relToDist)
        ) {
          res.statusCode = 400;
          res.end("Invalid pattern");
          return;
        }

        try {
          if (!existsSync(file)) {
            await packagePattern(folder);
          }
          const auxText = await readFile(file, "utf-8");
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.end(auxText);
        } catch (err) {
          server.config.logger.error(
            `[patterns] failed to serve ${folder}: ${err}`
          );
          res.statusCode = 500;
          res.end("Failed to package pattern");
        }
      });

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
