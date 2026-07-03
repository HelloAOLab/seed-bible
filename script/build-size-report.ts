import { program } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import {
  measureRoot,
  renderReport,
  type SizeSnapshot,
} from "./lib/buildSizeReport";

program
  .name("build-size-report")
  .description("Measures and reports build output sizes.");

program
  .command("measure")
  .description(
    "Measures the build output sizes for a repo checkout and writes a JSON snapshot."
  )
  .option(
    "--root <dir>",
    "The repo checkout to measure build outputs from.",
    "."
  )
  .requiredOption("--out <file>", "Path to write the JSON snapshot to.")
  .action(async (options) => {
    const snapshot = await measureRoot(options.root);
    await writeFile(options.out, JSON.stringify(snapshot, null, 2), "utf-8");
  });

program
  .command("report")
  .description(
    "Renders a markdown build-size report from one or two JSON snapshots."
  )
  .requiredOption("--head <file>", "Path to the head snapshot JSON.")
  .option(
    "--base <file>",
    "Path to the base snapshot JSON. Omit to render a single-snapshot report."
  )
  .option(
    "--threshold-kb <n>",
    "Flag bundles whose size changes by more than this many KB.",
    "300"
  )
  .option(
    "--base-unavailable",
    "Notes that a base comparison was expected but could not be produced (e.g. the base branch build failed).",
    false
  )
  .requiredOption("--out <file>", "Path to write the markdown report to.")
  .action(async (options) => {
    const head: SizeSnapshot = JSON.parse(
      await readFile(options.head, "utf-8")
    );
    const base: SizeSnapshot | undefined = options.base
      ? JSON.parse(await readFile(options.base, "utf-8"))
      : undefined;
    const thresholdBytes = Number(options.thresholdKb) * 1024;
    const markdown = renderReport(head, base, thresholdBytes, {
      baseUnavailable: !base && !!options.baseUnavailable,
    });
    await writeFile(options.out, markdown, "utf-8");
  });

program.parse();
