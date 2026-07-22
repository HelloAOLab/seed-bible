import { program } from "commander";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractSection } from "./lib/changelog";

const CHANGELOG_PATH = path.resolve("CHANGELOG.md");

program
  .name("changelog")
  .description("Commands for working with the CHANGELOG.");

program
  .command("extract <version>")
  .description(
    "Prints the CHANGELOG section for the given version to stdout (an optional leading 'v' is ignored). Used by the release workflow to build the GitHub Release notes."
  )
  .action(async (version: string) => {
    const normalized = version.startsWith("v") ? version.slice(1) : version;
    const text = await readFile(CHANGELOG_PATH, "utf-8");
    process.stdout.write(`${extractSection(text, normalized)}\n`);
  });

await program.parseAsync();
