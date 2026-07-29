import {
  renderCoverageSummary,
  type CoverageSummaryJson,
} from "../../../../script/lib/coverageSummary";

function metric(covered: number, total: number) {
  return {
    total,
    covered,
    skipped: 0,
    pct: total === 0 ? ("Unknown" as const) : (covered / total) * 100,
  };
}

function fileEntry(covered: number, total: number) {
  return {
    lines: metric(covered, total),
    statements: metric(covered, total),
    functions: metric(covered, total),
    branches: metric(covered, total),
  };
}

function summary(
  files: Record<string, { covered: number; total: number }> = {},
  totalOverrides: Partial<CoverageSummaryJson["total"]> = {}
): CoverageSummaryJson {
  const total = {
    lines: metric(92, 100),
    statements: metric(92, 100),
    functions: metric(92, 100),
    branches: metric(92, 100),
    ...totalOverrides,
  };
  const result: CoverageSummaryJson = { total };
  for (const [filePath, { covered, total: fileTotal }] of Object.entries(
    files
  )) {
    result[filePath] = fileEntry(covered, fileTotal);
  }
  return result;
}

describe("renderCoverageSummary", () => {
  it("renders the overall metrics table", () => {
    const markdown = renderCoverageSummary(summary());
    expect(markdown).toContain("### Coverage Summary");
    expect(markdown).toContain("| Statements | 92.0% | 92 / 100 |");
    expect(markdown).toContain("| Branches | 92.0% | 92 / 100 |");
    expect(markdown).toContain("| Functions | 92.0% | 92 / 100 |");
    expect(markdown).toContain("| Lines | 92.0% | 92 / 100 |");
  });

  it("groups files under their packages/<name> directory", () => {
    const markdown = renderCoverageSummary(
      summary({
        "packages/seed-bible/foo.ts": { covered: 10, total: 100 },
        "packages/seed-bible/bar.ts": { covered: 20, total: 100 },
        "packages/scripture-map/baz.ts": { covered: 90, total: 100 },
      })
    );
    expect(markdown).toContain("#### Coverage by Package");
    expect(markdown).toContain(
      "| `packages/seed-bible` | 15.0% | 15.0% | 15.0% | 15.0% |"
    );
    expect(markdown).toContain(
      "| `packages/scripture-map` | 90.0% | 90.0% | 90.0% | 90.0% |"
    );
  });

  it("sorts packages worst line coverage first", () => {
    const markdown = renderCoverageSummary(
      summary({
        "packages/good/a.ts": { covered: 95, total: 100 },
        "packages/bad/a.ts": { covered: 5, total: 100 },
        "packages/mid/a.ts": { covered: 50, total: 100 },
      })
    );
    const badIndex = markdown.indexOf("packages/bad");
    const midIndex = markdown.indexOf("packages/mid");
    const goodIndex = markdown.indexOf("packages/good");
    expect(badIndex).toBeLessThan(midIndex);
    expect(midIndex).toBeLessThan(goodIndex);
  });

  it("falls back to the top-level directory for paths outside packages/", () => {
    const markdown = renderCoverageSummary(
      summary({
        "script/lib/foo.ts": { covered: 10, total: 100 },
      })
    );
    expect(markdown).toContain("`script`");
  });

  it("strips a `root` prefix from absolute file paths before grouping", () => {
    const withAbsolutePaths: CoverageSummaryJson = {
      total: summary().total,
      "/repo/packages/scripture-map/deep/bad.ts": fileEntry(10, 100),
    };
    const markdown = renderCoverageSummary(withAbsolutePaths, {
      root: "/repo",
    });
    expect(markdown).toContain("`packages/scripture-map`");
    expect(markdown).not.toContain("/repo/packages");
  });

  it("renders n/a for a package with no coverable lines", () => {
    const withEmptyFile: CoverageSummaryJson = {
      total: summary().total,
      "packages/empty/a.ts": fileEntry(0, 0),
    };
    const markdown = renderCoverageSummary(withEmptyFile);
    expect(markdown).toContain("| `packages/empty` | n/a | n/a | n/a | n/a |");
  });

  it("omits the by-package section when there are no per-file entries", () => {
    const markdown = renderCoverageSummary(summary());
    expect(markdown).not.toContain("Coverage by Package");
  });
});
