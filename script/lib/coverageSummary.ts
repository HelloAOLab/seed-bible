/** One metric (statements/branches/functions/lines) from a vitest/istanbul `coverage-summary.json`. */
export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  pct: number | "Unknown";
}

/** The `total` entry (or any per-file entry) of a `coverage-summary.json`. */
export interface CoverageFileSummary {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

/** Full shape of vitest's `json-summary` coverage reporter output. */
export interface CoverageSummaryJson {
  total: CoverageFileSummary;
  [filePath: string]: CoverageFileSummary;
}

const METRICS: { key: keyof CoverageFileSummary; label: string }[] = [
  { key: "statements", label: "Statements" },
  { key: "branches", label: "Branches" },
  { key: "functions", label: "Functions" },
  { key: "lines", label: "Lines" },
];

function pctCell(pct: number | "Unknown"): string {
  return pct === "Unknown" ? "n/a" : `${pct.toFixed(1)}%`;
}

function relativize(filePath: string, rootPrefix: string): string {
  return filePath.startsWith(rootPrefix)
    ? filePath.slice(rootPrefix.length)
    : filePath;
}

/**
 * Groups a repo-relative file path under its top-level `packages/<name>`
 * directory (this repo's workspace unit), so results are readable as "how's
 * this package doing" rather than a giant per-file list. Anything outside
 * `packages/` (there shouldn't be any, given the coverage `include` glob)
 * falls back to its top-level directory, or `other` for a bare filename.
 */
function packageOf(relativeFilePath: string): string {
  const segments = relativeFilePath.split("/");
  if (segments[0] === "packages" && segments.length > 1) {
    return `${segments[0]}/${segments[1]}`;
  }
  return segments[0] ?? "other";
}

interface AggregatedMetric {
  covered: number;
  total: number;
}

function aggregateMetric(
  entries: CoverageFileSummary[],
  key: keyof CoverageFileSummary
): AggregatedMetric {
  let covered = 0;
  let total = 0;
  for (const entry of entries) {
    covered += entry[key].covered;
    total += entry[key].total;
  }
  return { covered, total };
}

function pctOf({ covered, total }: AggregatedMetric): number | "Unknown" {
  return total === 0 ? "Unknown" : (covered / total) * 100;
}

/**
 * Renders a markdown coverage summary suitable for `$GITHUB_STEP_SUMMARY`:
 * an overall metrics table, plus a per-package breakdown (worst line
 * coverage first) so a regression in a package is visible without opening
 * the full HTML report.
 */
export function renderCoverageSummary(
  summary: CoverageSummaryJson,
  options: { root?: string } = {}
): string {
  const rootPrefix = options.root ? `${options.root.replace(/\/$/, "")}/` : "";
  const lines: string[] = [];
  lines.push("### Coverage Summary", "");
  lines.push("| Metric | Coverage | Covered / Total |", "| --- | --- | --- |");
  for (const { key, label } of METRICS) {
    const metric = summary.total[key];
    lines.push(
      `| ${label} | ${pctCell(metric.pct)} | ${metric.covered} / ${metric.total} |`
    );
  }

  const filesByPackage = new Map<string, CoverageFileSummary[]>();
  for (const [filePath, file] of Object.entries(summary)) {
    if (filePath === "total") continue;
    const relativePath =
      rootPrefix.length > 0 ? relativize(filePath, rootPrefix) : filePath;
    const pkg = packageOf(relativePath);
    const existing = filesByPackage.get(pkg);
    if (existing) {
      existing.push(file);
    } else {
      filesByPackage.set(pkg, [file]);
    }
  }

  const packageRows = [...filesByPackage.entries()]
    .map(([pkg, entries]) => ({
      pkg,
      statements: aggregateMetric(entries, "statements"),
      branches: aggregateMetric(entries, "branches"),
      functions: aggregateMetric(entries, "functions"),
      lines: aggregateMetric(entries, "lines"),
    }))
    .sort((a, b) => {
      const aPct = pctOf(a.lines);
      const bPct = pctOf(b.lines);
      if (aPct === "Unknown" && bPct === "Unknown") return 0;
      if (aPct === "Unknown") return -1;
      if (bPct === "Unknown") return 1;
      return aPct - bPct;
    });

  if (packageRows.length > 0) {
    lines.push(
      "",
      "#### Coverage by Package",
      "",
      "| Package | Statements | Branches | Functions | Lines |",
      "| --- | --- | --- | --- | --- |"
    );
    for (const row of packageRows) {
      lines.push(
        `| \`${row.pkg}\` | ${pctCell(pctOf(row.statements))} | ${pctCell(pctOf(row.branches))} | ${pctCell(pctOf(row.functions))} | ${pctCell(pctOf(row.lines))} |`
      );
    }
  }

  return lines.join("\n") + "\n";
}
