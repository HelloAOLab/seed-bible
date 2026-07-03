import { existsSync, readFileSync } from "node:fs";
import { promises as fsp } from "node:fs";
import * as path from "node:path";
import { gzipSync } from "node:zlib";

/** A single top-level build output (a directory or a single file) and its total size. */
export interface OutputEntry {
  label: string;
  path: string;
  bytes: number;
}

/** A client asset file (JS/CSS under `standalone/dist/client/assets`), keyed by a hash-stable label. */
export interface AssetFileEntry {
  label: string;
  relPath: string;
  bytes: number;
  gzipBytes: number;
}

/** One of the largest files found anywhere in the client build. */
export interface TopFileEntry {
  relPath: string;
  bytes: number;
  gzipBytes: number;
}

/** A full size measurement of one build (one branch/checkout). */
export interface SizeSnapshot {
  outputs: OutputEntry[];
  totalBytes: number;
  assetFiles: AssetFileEntry[];
  topFiles: TopFileEntry[];
}

const OUTPUT_TARGETS: { label: string; relPath: string }[] = [
  {
    label: "Client bundle (`standalone/dist/client`)",
    relPath: "standalone/dist/client",
  },
  {
    label: "SSR bundle (`standalone/dist/server`)",
    relPath: "standalone/dist/server",
  },
  {
    label: "Server bundle (`server/dist/index.js`)",
    relPath: "server/dist/index.js",
  },
  { label: "Patterns (`pattern-dist`)", relPath: "pattern-dist" },
];

const CLIENT_DIR = "standalone/dist/client";
const ASSETS_DIR = `${CLIENT_DIR}/assets`;
const MANIFEST_PATH = `${CLIENT_DIR}/.vite/manifest.json`;
const TOP_FILES_COUNT = 5;

/** The canonical, hash-stable name for the two chunks called out explicitly in reports. */
export const VENDOR_LABEL = "assets/vendor.js";
export const INDEX_LABEL = "assets/index.js";

// Vite/Rollup content hashes observed in this build are 8 base64url-ish
// characters, but a few extra characters of slack keeps this from breaking on
// a minor hash-length change.
const HASH_SUFFIX_RE = /-[A-Za-z0-9_-]{6,12}(\.[^./]+)$/;

/** Strips a trailing content-hash segment (e.g. `vendor-DCGzEOOr.js` -> `vendor.js`). */
export function stripHash(filename: string): string {
  return filename.replace(HASH_SUFFIX_RE, "$1");
}

interface ManifestEntry {
  file?: string;
  name?: string;
  css?: string[];
  assets?: string[];
}

type ViteManifest = Record<string, ManifestEntry>;

/** Derives a hash-stable label for a manifest-listed file, e.g. `assets/vendor-DCGzEOOr.js` -> `assets/vendor.js`. */
export function canonicalLabelFor(
  file: string,
  name: string | undefined
): string {
  const dir = path.posix.dirname(file);
  const base = name
    ? `${name}${path.posix.extname(file)}`
    : stripHash(path.posix.basename(file));
  return dir === "." ? base : `${dir}/${base}`;
}

/**
 * Builds a `hashed file path -> canonical label` map from a Vite client
 * manifest. CSS files inherit their owning entry's name since they don't get
 * their own top-level manifest key. Plain assets (images, icons) are left
 * unmapped — callers should fall back to `stripHash` for those.
 */
export function buildCanonicalMap(manifest: ViteManifest): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of Object.values(manifest)) {
    if (entry.file) {
      map.set(entry.file, canonicalLabelFor(entry.file, entry.name));
    }
    for (const cssFile of entry.css ?? []) {
      map.set(cssFile, canonicalLabelFor(cssFile, entry.name));
    }
  }
  return map;
}

async function readManifest(root: string): Promise<ViteManifest> {
  try {
    const raw = await fsp.readFile(path.join(root, MANIFEST_PATH), "utf-8");
    return JSON.parse(raw) as ViteManifest;
  } catch {
    return {};
  }
}

interface WalkedFile {
  absPath: string;
  relPath: string;
}

/** Recursively lists every file under `dir`, with `relPath` using forward slashes. */
async function walkFiles(dir: string): Promise<WalkedFile[]> {
  const results: WalkedFile[] = [];

  async function walk(current: string, relPrefix: string): Promise<void> {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(abs, rel);
      } else if (entry.isFile()) {
        results.push({ absPath: abs, relPath: rel });
      }
    }
  }

  await walk(dir, "");
  return results;
}

async function dirTotalBytes(dir: string): Promise<number> {
  const files = await walkFiles(dir);
  let total = 0;
  for (const file of files) {
    total += (await fsp.stat(file.absPath)).size;
  }
  return total;
}

async function outputBytes(
  root: string,
  relPath: string
): Promise<number | null> {
  const absPath = path.join(root, relPath);
  if (!existsSync(absPath)) {
    return null;
  }
  const stat = await fsp.stat(absPath);
  return stat.isDirectory() ? dirTotalBytes(absPath) : stat.size;
}

function gzipBytesOf(absPath: string): number {
  return gzipSync(readFileSync(absPath)).length;
}

/**
 * Measures the known build outputs under `root` (a repo checkout — `.` for
 * the current checkout, or a sibling directory for a second branch's
 * checkout). Missing outputs are simply omitted, not an error.
 */
export async function measureRoot(root: string): Promise<SizeSnapshot> {
  const outputs: OutputEntry[] = [];
  let totalBytes = 0;
  for (const target of OUTPUT_TARGETS) {
    const bytes = await outputBytes(root, target.relPath);
    if (bytes !== null) {
      outputs.push({ label: target.label, path: target.relPath, bytes });
      totalBytes += bytes;
    }
  }

  const assetFiles: AssetFileEntry[] = [];
  const assetsDirAbs = path.join(root, ASSETS_DIR);
  if (existsSync(assetsDirAbs)) {
    const canonicalMap = buildCanonicalMap(await readManifest(root));
    const entries = await fsp.readdir(assetsDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.endsWith(".map")) {
        continue;
      }
      const relPath = `assets/${entry.name}`;
      const absPath = path.join(assetsDirAbs, entry.name);
      const bytes = (await fsp.stat(absPath)).size;
      const label = canonicalMap.get(relPath) ?? stripHash(relPath);
      assetFiles.push({
        label,
        relPath,
        bytes,
        gzipBytes: gzipBytesOf(absPath),
      });
    }
  }

  const topFiles: TopFileEntry[] = [];
  const clientDirAbs = path.join(root, CLIENT_DIR);
  if (existsSync(clientDirAbs)) {
    const candidates = (await walkFiles(clientDirAbs)).filter(
      (f) => !f.relPath.endsWith(".map")
    );
    const withSizes = await Promise.all(
      candidates.map(async (f) => ({
        relPath: f.relPath,
        absPath: f.absPath,
        bytes: (await fsp.stat(f.absPath)).size,
      }))
    );
    withSizes.sort((a, b) => b.bytes - a.bytes);
    for (const f of withSizes.slice(0, TOP_FILES_COUNT)) {
      topFiles.push({
        relPath: f.relPath,
        bytes: f.bytes,
        gzipBytes: gzipBytesOf(f.absPath),
      });
    }
  }

  return { outputs, totalBytes, assetFiles, topFiles };
}

const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** Formats a byte count in the same style as `numfmt --to=iec --suffix=B` (e.g. `1.2MB`). */
export function formatBytes(
  bytes: number,
  options: { signed?: boolean } = {}
): string {
  const sign = options.signed ? (bytes > 0 ? "+" : bytes < 0 ? "-" : "") : "";
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const formatted =
    unitIndex === 0
      ? String(value)
      : value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, "");
  return `${sign}${formatted}${UNITS[unitIndex]}`;
}

export interface OutputDiffRow {
  label: string;
  baseBytes: number | null;
  headBytes: number | null;
  deltaBytes: number;
  flagged: boolean;
}

export interface AssetDiffRow {
  label: string;
  baseBytes: number | null;
  headBytes: number | null;
  baseGzipBytes: number | null;
  headGzipBytes: number | null;
  deltaBytes: number;
  deltaGzipBytes: number;
  flagged: boolean;
  status: "added" | "removed" | "changed" | "unchanged";
}

export interface SnapshotDiff {
  outputs: OutputDiffRow[];
  totalDelta: number;
  totalFlagged: boolean;
  assetFiles: AssetDiffRow[];
}

/** Orders labels head-first (preserving head's natural order), appending any base-only labels. */
function orderedLabels(headLabels: string[], baseLabels: string[]): string[] {
  const headSet = new Set(headLabels);
  return [...headLabels, ...baseLabels.filter((l) => !headSet.has(l))];
}

/** Diffs two snapshots, flagging any output/asset whose absolute size delta exceeds the threshold. */
export function diffSnapshots(
  head: SizeSnapshot,
  base: SizeSnapshot,
  thresholdBytes: number
): SnapshotDiff {
  const baseOutputs = new Map(base.outputs.map((o) => [o.label, o.bytes]));
  const headOutputs = new Map(head.outputs.map((o) => [o.label, o.bytes]));
  const outputs: OutputDiffRow[] = orderedLabels(
    head.outputs.map((o) => o.label),
    base.outputs.map((o) => o.label)
  ).map((label) => {
    const baseBytes = baseOutputs.get(label) ?? null;
    const headBytes = headOutputs.get(label) ?? null;
    const deltaBytes = (headBytes ?? 0) - (baseBytes ?? 0);
    return {
      label,
      baseBytes,
      headBytes,
      deltaBytes,
      flagged: Math.abs(deltaBytes) > thresholdBytes,
    };
  });

  const totalDelta = head.totalBytes - base.totalBytes;

  const baseAssets = new Map(base.assetFiles.map((f) => [f.label, f]));
  const headAssets = new Map(head.assetFiles.map((f) => [f.label, f]));
  const assetFiles: AssetDiffRow[] = orderedLabels(
    head.assetFiles.map((f) => f.label),
    base.assetFiles.map((f) => f.label)
  ).map((label) => {
    const baseFile = baseAssets.get(label);
    const headFile = headAssets.get(label);
    const baseBytes = baseFile?.bytes ?? null;
    const headBytes = headFile?.bytes ?? null;
    const baseGzipBytes = baseFile?.gzipBytes ?? null;
    const headGzipBytes = headFile?.gzipBytes ?? null;
    const deltaBytes = (headBytes ?? 0) - (baseBytes ?? 0);
    const deltaGzipBytes = (headGzipBytes ?? 0) - (baseGzipBytes ?? 0);
    const status: AssetDiffRow["status"] = !baseFile
      ? "added"
      : !headFile
        ? "removed"
        : deltaBytes === 0
          ? "unchanged"
          : "changed";
    return {
      label,
      baseBytes,
      headBytes,
      baseGzipBytes,
      headGzipBytes,
      deltaBytes,
      deltaGzipBytes,
      flagged: Math.abs(deltaBytes) > thresholdBytes,
      status,
    };
  });

  return {
    outputs,
    totalDelta,
    totalFlagged: Math.abs(totalDelta) > thresholdBytes,
    assetFiles,
  };
}

const NOISE_FLOOR_BYTES = 1024;
const MAX_CHANGED_FILES_ROWS = 15;

function sizeCell(bytes: number | null): string {
  return bytes === null ? "_missing_" : formatBytes(bytes);
}

function renderAssetDiffRow(
  label: string,
  row: AssetDiffRow | undefined
): string {
  if (!row) {
    return `| \`${label}\` | _not found_ | _not found_ | _n/a_ |`;
  }
  const deltaGzip =
    row.baseGzipBytes === null || row.headGzipBytes === null
      ? ""
      : `, gzip ${formatBytes(row.deltaGzipBytes, { signed: true })}`;
  return `| \`${label}\` | ${sizeCell(row.baseBytes)} | ${sizeCell(row.headBytes)} | ${formatBytes(row.deltaBytes, { signed: true })}${deltaGzip}${row.flagged ? " ⚠️" : ""} |`;
}

/**
 * Renders the full markdown build-size report. Single-snapshot mode (no
 * `base`) is used for plain pushes; diff mode (with `base`) is used for pull
 * requests and adds Base/Head/Δ columns plus a Flagged Bundles callout.
 */
export function renderReport(
  head: SizeSnapshot,
  base: SizeSnapshot | undefined,
  thresholdBytes: number,
  options: { baseUnavailable?: boolean } = {}
): string {
  const lines: string[] = [];
  lines.push("### Build Output Sizes", "");

  if (base) {
    const diff = diffSnapshots(head, base, thresholdBytes);
    lines.push("| Output | Base | Head | Δ |", "| --- | --- | --- | --- |");
    for (const row of diff.outputs) {
      lines.push(
        `| ${row.label} | ${sizeCell(row.baseBytes)} | ${sizeCell(row.headBytes)} | ${formatBytes(row.deltaBytes, { signed: true })}${row.flagged ? " ⚠️" : ""} |`
      );
    }
    lines.push(
      `| **Total** | **${formatBytes(base.totalBytes)}** | **${formatBytes(head.totalBytes)}** | **${formatBytes(diff.totalDelta, { signed: true })}**${diff.totalFlagged ? " ⚠️" : ""} |`
    );

    lines.push(
      "",
      "#### Client Chunks",
      "",
      "| Chunk | Base | Head | Δ (gzip Δ) |",
      "| --- | --- | --- | --- |"
    );
    const byLabel = new Map(diff.assetFiles.map((f) => [f.label, f]));
    for (const label of [VENDOR_LABEL, INDEX_LABEL]) {
      lines.push(renderAssetDiffRow(label, byLabel.get(label)));
    }

    const otherChanged = diff.assetFiles
      .filter((f) => f.label !== VENDOR_LABEL && f.label !== INDEX_LABEL)
      .filter((f) => Math.abs(f.deltaBytes) >= NOISE_FLOOR_BYTES)
      .sort((a, b) => Math.abs(b.deltaBytes) - Math.abs(a.deltaBytes));

    if (otherChanged.length > 0) {
      lines.push(
        "",
        "#### Other Changed Files",
        "",
        "| File | Base | Head | Δ (gzip Δ) |",
        "| --- | --- | --- | --- |"
      );
      for (const row of otherChanged.slice(0, MAX_CHANGED_FILES_ROWS)) {
        lines.push(renderAssetDiffRow(row.label, row));
      }
      if (otherChanged.length > MAX_CHANGED_FILES_ROWS) {
        lines.push(
          "",
          `_+${otherChanged.length - MAX_CHANGED_FILES_ROWS} more changed file(s) not shown._`
        );
      }
    }

    const flagged = [
      ...diff.outputs
        .filter((o) => o.flagged)
        .map((o) => ({
          label: o.label,
          base: o.baseBytes,
          head: o.headBytes,
          delta: o.deltaBytes,
        })),
      ...diff.assetFiles
        .filter((f) => f.flagged)
        .map((f) => ({
          label: `\`${f.label}\``,
          base: f.baseBytes,
          head: f.headBytes,
          delta: f.deltaBytes,
        })),
    ];
    lines.push("", "#### Flagged Bundles", "");
    if (flagged.length === 0) {
      lines.push(
        `✅ No bundles changed by more than ${formatBytes(thresholdBytes)}.`
      );
    } else {
      lines.push(
        `⚠️ **${flagged.length} bundle(s) changed by more than ${formatBytes(thresholdBytes)}:**`,
        ""
      );
      for (const f of flagged) {
        lines.push(
          `- ${f.label}: ${sizeCell(f.base)} → ${sizeCell(f.head)} (${formatBytes(f.delta, { signed: true })})`
        );
      }
    }
  } else {
    lines.push("| Output | Size |", "| --- | --- |");
    for (const o of head.outputs) {
      lines.push(`| ${o.label} | ${formatBytes(o.bytes)} |`);
    }
    lines.push(`| **Total** | **${formatBytes(head.totalBytes)}** |`);

    lines.push(
      "",
      "#### Client Chunks",
      "",
      "| Chunk | Raw | Gzip |",
      "| --- | --- | --- |"
    );
    const byLabel = new Map(head.assetFiles.map((f) => [f.label, f]));
    for (const label of [VENDOR_LABEL, INDEX_LABEL]) {
      const file = byLabel.get(label);
      lines.push(
        file
          ? `| \`${label}\` | ${formatBytes(file.bytes)} | ${formatBytes(file.gzipBytes)} |`
          : `| \`${label}\` | _not found_ | _not found_ |`
      );
    }

    if (options.baseUnavailable) {
      lines.push(
        "",
        "_Base branch build unavailable — size comparison skipped._"
      );
    }
  }

  lines.push(
    "",
    "#### Top 5 Largest Files (client build)",
    "",
    "| File | Raw | Gzip |",
    "| --- | --- | --- |"
  );
  if (head.topFiles.length === 0) {
    lines.push("| _not found_ | | |");
  } else {
    for (const f of head.topFiles) {
      lines.push(
        `| \`${f.relPath}\` | ${formatBytes(f.bytes)} | ${formatBytes(f.gzipBytes)} |`
      );
    }
  }

  return lines.join("\n") + "\n";
}
