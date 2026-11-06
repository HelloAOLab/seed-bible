import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".jsx",
  ".mjs",
]);
const SKIPPED_DIRS = new Set(["node_modules", "dist", ".git", "coverage"]);
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

export interface SourceFile {
  /** Relative to the project root, with forward slashes. */
  path: string;
  text: string;
}

/** The project's own source files, tests left out. */
export async function readProjectSources(root: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          await walk(path.join(dir, entry.name));
        }
      } else if (
        SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
        !TEST_FILE.test(entry.name) &&
        !entry.name.endsWith(".d.ts") &&
        !/\.config\.[cm]?[jt]s$/.test(entry.name)
      ) {
        const full = path.join(dir, entry.name);
        files.push({
          path: path.relative(root, full).split(path.sep).join("/"),
          text: await readFile(full, "utf-8"),
        });
      }
    }
  };
  await walk(root);
  return files;
}

const SDK_IMPORT = /from\s+["']seed-bible\/extensions["']/;

/**
 * Whether the project is a sandboxed extension: one written against
 * `seed-bible/extensions` (`defineExtension`), which Seed Bible runs in a
 * sandbox when it's loaded from a URL, rather than one that registers
 * itself with `registerExtension` and only runs bundled into the app.
 */
export function isSandboxedProject(sources: SourceFile[]): boolean {
  return sources.some((file) => SDK_IMPORT.test(file.text));
}
