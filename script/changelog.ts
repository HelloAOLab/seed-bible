import { program } from "commander";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ChangelogSectionNotFoundError,
  EXTRACT_NOT_FOUND_EXIT_CODE,
  extractSection,
} from "./lib/changelog";

const CHANGELOG_PATH = path.resolve("CHANGELOG.md");

program
  .name("changelog")
  .description("Commands for working with the CHANGELOG.");

program
  .command("extract <version>")
  .description(
    "Prints the CHANGELOG section for the given version to stdout (an optional leading 'v' is ignored). Used by the release workflow to build the GitHub Release notes. Exits with a distinct status " +
      `(${EXTRACT_NOT_FOUND_EXIT_CODE}) when the version has no stamped section, so callers can tell that apart from a genuine failure.`
  )
  .action(async (version: string) => {
    const normalized = version.startsWith("v") ? version.slice(1) : version;
    const text = await readFile(CHANGELOG_PATH, "utf-8");
    let section: string;
    try {
      section = extractSection(text, normalized);
    } catch (error) {
      if (error instanceof ChangelogSectionNotFoundError) {
        console.error(error.message);
        process.exitCode = EXTRACT_NOT_FOUND_EXIT_CODE;
        return;
      }
      // A genuine bug (not "unstamped changelog") — rethrow so it surfaces
      // with its full stack trace and the default non-zero exit code.
      throw error;
    }
    process.stdout.write(`${section}\n`);
  });

await program.parseAsync();
