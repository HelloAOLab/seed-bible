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

function summary(
  files: Record<string, number> = {},
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
  for (const [filePath, pct] of Object.entries(files)) {
    result[filePath] = {
      lines: metric(pct, 100),
      statements: metric(pct, 100),
      functions: metric(pct, 100),
      branches: metric(pct, 100),
    };
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

  it("omits the low-coverage section when nothing is below the threshold", () => {
    const markdown = renderCoverageSummary(summary({ "src/foo.ts": 80 }));
    expect(markdown).not.toContain("Files Below");
  });

  it("lists files below the low-coverage threshold, worst first", () => {
    const markdown = renderCoverageSummary(
      summary({ "src/bad.ts": 10, "src/worse.ts": 5, "src/fine.ts": 90 })
    );
    expect(markdown).toContain("#### Files Below 50% Line Coverage");
    const worseIndex = markdown.indexOf("src/worse.ts");
    const badIndex = markdown.indexOf("src/bad.ts");
    expect(worseIndex).toBeGreaterThan(-1);
    expect(worseIndex).toBeLessThan(badIndex);
    expect(markdown).not.toContain("src/fine.ts");
  });

  it("respects a custom low-coverage threshold", () => {
    const markdown = renderCoverageSummary(summary({ "src/mid.ts": 60 }), {
      lowCoverageThreshold: 70,
    });
    expect(markdown).toContain("#### Files Below 70% Line Coverage");
    expect(markdown).toContain("src/mid.ts");
  });

  it("caps the low-coverage list and notes how many were hidden", () => {
    const files: Record<string, number> = {};
    for (let i = 0; i < 20; i++) {
      files[`src/file${i}.ts`] = 1;
    }
    const markdown = renderCoverageSummary(summary(files));
    expect(markdown).toContain("+5 more file(s) not shown.");
  });

  it("strips a `root` prefix from absolute file paths", () => {
    const withAbsolutePaths: CoverageSummaryJson = {
      total: summary().total,
      "/repo/src/deep/bad.ts": {
        lines: metric(10, 100),
        statements: metric(10, 100),
        functions: metric(10, 100),
        branches: metric(10, 100),
      },
    };
    const markdown = renderCoverageSummary(withAbsolutePaths, {
      root: "/repo",
    });
    expect(markdown).toContain("`src/deep/bad.ts`");
    expect(markdown).not.toContain("/repo/src/deep/bad.ts");
  });

  it("renders n/a for files with no coverable lines", () => {
    const markdown = renderCoverageSummary(
      summary(
        {},
        {
          lines: metric(0, 0),
        }
      )
    );
    expect(markdown).toContain("| Lines | n/a | 0 / 0 |");
  });
});
