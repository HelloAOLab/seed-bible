import { PurgeCSS, type ComplexSafelist } from "purgecss";
import fs from "fs";
import path from "path";

/**
 * Selectors that must survive purging even when nothing in the scanned content
 * mentions them.
 *
 * - **Theming.** Every `--sb-*` custom property lives in a `:root` block, and
 *   `ThemeManager` re-declares many of the same variables in a `<style>` tag it
 *   injects at runtime — content PurgeCSS never sees. Custom properties are
 *   never removed (`variables: false` below) and `:root` is on PurgeCSS's own
 *   internal safelist, so the variables themselves are safe; the `*-theme-*`
 *   pattern here is what keeps the theme editor's own UI classes.
 * - **Highlights.** The reader builds highlight classes at runtime
 *   (`sb-highlight-${colorId}`) and `ThemeManager` generates the matching rules,
 *   so anything containing `highlight` is kept outright.
 *
 * `greedy` keeps a whole rule when *any* part of its selector matches, which is
 * what we want here: `.sb-highlight-ribbon-broadcast` and
 * `.sb-theme-color-row .sb-theme-color-input` both survive as complete rules.
 */
export const PURGE_SAFELIST: ComplexSafelist = {
  // `&` is the CSS nesting reference. PurgeCSS drops any rule whose selector
  // contains no class, id or tag it recognises, so a nested `&:has(...)` /
  // `&:hover` block is deleted even though its parent survives. Safelisting `&`
  // treats the nesting marker as "found"; a nested rule that also names an
  // unused class (`& .sb-gone`) is still purged normally.
  standard: ["&", "html", "body", "sb-app-root"],
  greedy: [/highlight/, /(^|-)theme(-|$)/],
};

/** A prefix needs this many hyphens before it is trusted — see below. */
const MIN_PREFIX_HYPHENS = 2;

/**
 * Builds safelist entries for class names the app assembles at runtime.
 *
 * PurgeCSS's extractor pulls `[A-Za-z0-9_-]+` runs out of the content, so a
 * class built from a template literal — `` `sb-extension-state-${installState}`
 * `` — only ever yields the token `sb-extension-state-`, never the real class
 * `sb-extension-state-installed`. Left alone, PurgeCSS deletes every such rule.
 *
 * So any token ending in a hyphen is read as "class names get built from this
 * prefix", and everything starting with it is kept. Deriving this from the
 * content on every build rather than hand-listing it is what stops a *new*
 * dynamic class name from silently losing its styles later.
 *
 * A prefix with only one hyphen (`sb-`, from `` `sb-${id}` ``) would safelist
 * most of the stylesheet, so those are dropped; a one-segment dynamic prefix
 * needs an explicit entry in {@link PURGE_SAFELIST} instead.
 */
export function derivePrefixSafelist(content: string[]): RegExp[] {
  const prefixes = new Set<string>();
  for (const text of content) {
    const tokens = text.match(/[A-Za-z0-9_-]+/g);
    if (!tokens) continue;
    for (const token of tokens) {
      if (!token.endsWith("-")) continue;
      if (!/[A-Za-z0-9_]/.test(token)) continue;
      if (countHyphens(token) < MIN_PREFIX_HYPHENS) continue;
      prefixes.add(token);
    }
  }
  if (prefixes.size === 0) return [];
  // One alternation rather than one regex per prefix: PurgeCSS runs the whole
  // standard safelist against every part of every selector, and a real build
  // derives a few hundred prefixes.
  const alternation = [...prefixes].map(escapeRegExp).join("|");
  return [new RegExp(`^(?:${alternation})`)];
}

function countHyphens(token: string): number {
  let count = 0;
  for (const character of token) {
    if (character === "-") count++;
  }
  return count;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface PurgeCssFile {
  /** Only used to key the returned map; PurgeCSS never reads from disk here. */
  name: string;
  css: string;
}

/**
 * Removes the rules in each file whose selectors appear nowhere in `content`,
 * returning the purged CSS keyed by the file's `name`.
 *
 * Every file goes through a single {@link PurgeCSS} call because the expensive
 * part is extracting selectors from the content, and that work is shared.
 * `content` is raw text (built JS chunks, source files, HTML) rather than file
 * paths so callers can feed in the in-memory bundle.
 */
export async function purgeCssFiles(
  files: PurgeCssFile[],
  content: string[]
): Promise<Map<string, string>> {
  if (files.length === 0) return new Map();

  const results = await new PurgeCSS().purge({
    css: files.map((file) => ({ raw: file.css, name: file.name })),
    content: content.map((raw) => ({ raw, extension: "js" })),
    safelist: {
      ...PURGE_SAFELIST,
      standard: [
        ...(PURGE_SAFELIST.standard ?? []),
        ...derivePrefixSafelist(content),
      ],
    },
    // Custom properties, `@keyframes` and `@font-face` are all left in place.
    // Their usage is routinely assembled at runtime — theme variables written
    // by `ThemeManager`, animation names swapped by class — and PurgeCSS only
    // sees the static CSS, so removing them trades a small size win for a class
    // of bug that stays invisible until one specific theme or animation runs.
    variables: false,
    keyframes: false,
    fontFace: false,
  });

  // PurgeCSS returns results in input order; `file` carries the `name` back for
  // raw inputs, but fall back to position so a version change can't silently
  // scramble the mapping.
  return new Map(
    results.map((result, index) => [
      result.file ?? files[index]?.name ?? String(index),
      result.css,
    ])
  );
}

/** Minimal view of a rollup output bundle — enough to read the JS chunks. */
export type BundleLike = Record<string, { type: string; code?: string }>;

/**
 * Everything PurgeCSS should treat as "places a class name can appear".
 *
 * The emitted JS chunks are the authoritative list for the client, and they are
 * the only place classes owned by a dependency show up (`.ProseMirror`, styled
 * by `TextItemInput.css`, exists only inside TipTap). The sources are scanned as
 * well because the server-rendered markup is produced by a *separate* SSR
 * bundle that this build never sees.
 */
export function collectPurgeContent(
  bundle: BundleLike,
  projectRoot: string
): string[] {
  const chunks: string[] = [];
  for (const output of Object.values(bundle)) {
    if (output.type === "chunk" && output.code) chunks.push(output.code);
  }
  return [...chunks, ...readSourceContent(projectRoot)];
}

const SOURCE_ROOTS = ["packages", "standalone", "index.html"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".html"];
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "pattern-dist",
  "obsolete",
  ".git",
]);

/** Reads the app's own source files as purge content. */
export function readSourceContent(projectRoot: string): string[] {
  const content: string[] = [];
  for (const root of SOURCE_ROOTS) {
    collectFiles(path.resolve(projectRoot, root), content);
  }
  return content;
}

function collectFiles(target: string, into: string[]): void {
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat) return;

  if (stat.isFile()) {
    into.push(fs.readFileSync(target, "utf-8"));
    return;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      collectFiles(entryPath, into);
      continue;
    }
    if (!entry.isFile()) continue;
    // Tests reference class names that nothing in the shipped app uses; letting
    // them count as content would keep dead CSS alive.
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) continue;
    into.push(fs.readFileSync(entryPath, "utf-8"));
  }
}

/**
 * Escape hatch for when a styling bug is suspected to be a purge false
 * positive: `DISABLE_PURGECSS=true pnpm build` ships the full CSS.
 */
export function isPurgeCssDisabled(): boolean {
  return process.env.DISABLE_PURGECSS === "true";
}

/** `1234 -> 900 bytes (27% smaller)`, for the build log. */
export function formatPurgeSavings(before: number, after: number): string {
  const percent = before === 0 ? 0 : Math.round((1 - after / before) * 100);
  return `${formatBytes(before)} -> ${formatBytes(after)} (${percent}% smaller)`;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`;
}
