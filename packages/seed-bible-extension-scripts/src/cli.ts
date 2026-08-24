#!/usr/bin/env node
import { Command } from "commander";
import { runCheck } from "./commands/check.js";
import { runTest } from "./commands/test.js";
import { runBuild } from "./commands/build.js";
import { runDev } from "./commands/dev.js";
import { runLint } from "./commands/lint.js";
import { runPublish } from "./commands/publish.js";

const program = new Command();

program
  .name("seed-bible-extension-scripts")
  .description(
    "Check, test, build, and run a Seed Bible extension scaffolded by create-seed-bible-extension."
  );

program
  .command("check")
  .description("Type-check the extension with its own tsconfig.json.")
  .action(async () => {
    process.exitCode = await runCheck();
  });

program
  .command("lint")
  .description("Lint the extension with its own eslint.config.mts.")
  .option("--fix", "automatically fix problems where possible")
  .action(async (opts: { fix?: boolean }) => {
    process.exitCode = await runLint({ fix: Boolean(opts.fix) });
  });

program
  .command("test")
  .description("Run the extension's test suite with Vitest.")
  .allowUnknownOption(true)
  .action(async (_opts, command: Command) => {
    process.exitCode = await runTest(command.args);
  });

program
  .command("build")
  .description(
    "Build the extension: a monorepo-ready package, and (with --standalone) an experimental self-contained bundle."
  )
  .option(
    "--standalone",
    "also produce a self-contained ES module for hosting outside the seed-bible monorepo (experimental — see the generated README)"
  )
  .action(async (opts: { standalone?: boolean }) => {
    process.exitCode = await runBuild({ standalone: Boolean(opts.standalone) });
  });

program
  .command("publish")
  .description(
    "Build the extension standalone and publish it as a hosted, discoverable ExtensionSet (see context.extensions.discoverExtensionSet)."
  )
  .option(
    "--dry-run",
    "build and print the ExtensionSet manifest without uploading anything"
  )
  .action(async (opts: { dryRun?: boolean }) => {
    process.exitCode = await runPublish({ dryRun: Boolean(opts.dryRun) });
  });

program
  .command("dev")
  .description(
    "Run a real Seed Bible dev server with this extension auto-installed."
  )
  .option(
    "--repo <path>",
    "path to an existing seed-bible checkout to use instead of the managed cache"
  )
  .option("--port <port>", "port to run the seed-bible dev server on")
  .action(async (opts: { repo?: string; port?: string }) => {
    process.exitCode = await runDev({
      repoPath: opts.repo,
      port: opts.port ? Number(opts.port) : undefined,
    });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
