import { program } from "commander";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import {
  renderCoverageSummary,
  type CoverageSummaryJson,
} from "./lib/coverageSummary";

program
  .name("coverage-summary")
  .description(
    "Renders a markdown test coverage summary from a vitest `json-summary` coverage report."
  )
  .requiredOption(
    "--summary <file>",
    "Path to the coverage-summary.json produced by vitest's json-summary reporter."
  )
  .requiredOption("--out <file>", "Path to write the markdown summary to.")
  .action(async (options) => {
    // The coverage step may not have produced a report at all (e.g. the test
    // run crashed before vitest could write it) — note that instead of
    // failing this step too, so the workflow summary still says *something*.
    if (!existsSync(options.summary)) {
      await writeFile(
        options.out,
        `### Coverage Summary\n\n_No coverage report found at \`${options.summary}\`._\n`,
        "utf-8"
      );
      return;
    }
    const summary: CoverageSummaryJson = JSON.parse(
      await readFile(options.summary, "utf-8")
    );
    const markdown = renderCoverageSummary(summary, {
      root: process.cwd(),
    });
    await writeFile(options.out, markdown, "utf-8");
  });

program.parseAsync().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
