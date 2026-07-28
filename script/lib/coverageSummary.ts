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

const MAX_LOW_COVERAGE_ROWS = 15;

function pctCell(pct: number | "Unknown"): string {
  return pct === "Unknown" ? "n/a" : `${pct.toFixed(1)}%`;
}

function relativize(filePath: string, rootPrefix: string): string {
  return filePath.startsWith(rootPrefix)
    ? filePath.slice(rootPrefix.length)
    : filePath;
}

/**
 * Renders a markdown coverage summary suitable for `$GITHUB_STEP_SUMMARY`:
 * an overall metrics table, plus (below `lowCoverageThreshold`% line
 * coverage) a table of the worst-covered files so regressions are visible
 * without opening the full HTML report.
 */
export function renderCoverageSummary(
  summary: CoverageSummaryJson,
  options: { lowCoverageThreshold?: number; root?: string } = {}
): string {
  const lowCoverageThreshold = options.lowCoverageThreshold ?? 50;
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

  const lowCoverageFiles = Object.entries(summary)
    .filter(([filePath]) => filePath !== "total")
    .map(([filePath, file]) => ({
      filePath:
        rootPrefix.length > 0 ? relativize(filePath, rootPrefix) : filePath,
      pct: file.lines.pct,
    }))
    .filter(
      (f): f is { filePath: string; pct: number } =>
        typeof f.pct === "number" && f.pct < lowCoverageThreshold
    )
    .sort((a, b) => a.pct - b.pct);

  if (lowCoverageFiles.length > 0) {
    lines.push(
      "",
      `#### Files Below ${lowCoverageThreshold}% Line Coverage`,
      "",
      "| File | Line Coverage |",
      "| --- | --- |"
    );
    for (const f of lowCoverageFiles.slice(0, MAX_LOW_COVERAGE_ROWS)) {
      lines.push(`| \`${f.filePath}\` | ${f.pct.toFixed(1)}% |`);
    }
    if (lowCoverageFiles.length > MAX_LOW_COVERAGE_ROWS) {
      lines.push(
        "",
        `_+${lowCoverageFiles.length - MAX_LOW_COVERAGE_ROWS} more file(s) not shown._`
      );
    }
  }

  return lines.join("\n") + "\n";
}
