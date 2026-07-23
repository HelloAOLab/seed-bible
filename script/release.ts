import { program } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { bumpVersion, stampChangelog, today } from "./lib/changelog";

// The authoritative app version: this is the one Vite bakes into the build as
// __APP_VERSION__ (see vite.config.ts) and shows in the Settings footer. The
// root package.json version is intentionally separate and left untouched.
const APP_PACKAGE_PATH = path.resolve("packages", "seed-bible", "package.json");
const CHANGELOG_PATH = path.resolve("CHANGELOG.md");

async function readAppVersion(): Promise<string> {
  const parsed = JSON.parse(await readFile(APP_PACKAGE_PATH, "utf-8")) as {
    version?: string;
  };
  if (!parsed.version) {
    throw new Error(`No "version" field found in ${APP_PACKAGE_PATH}.`);
  }
  return parsed.version;
}

async function writeAppVersion(version: string): Promise<void> {
  const text = await readFile(APP_PACKAGE_PATH, "utf-8");
  // Rewrite only the first "version" field so the file's formatting, key order,
  // and trailing newline are preserved exactly.
  const updated = text.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);
  if (updated === text) {
    throw new Error(
      `Could not find a "version" field to update in ${APP_PACKAGE_PATH}.`
    );
  }
  await writeFile(APP_PACKAGE_PATH, updated, "utf-8");
}

program.name("release").description("Commands for preparing a release.");

program
  .command("prepare <bump>")
  .description(
    'Bumps the app version and stamps the CHANGELOG on develop. <bump> is "major", "minor", "patch", or an explicit X.Y.Z version.'
  )
  .option(
    "--date <date>",
    "Release date (YYYY-MM-DD). Defaults to today (UTC)."
  )
  .action(async (bump: string, options: { date?: string }) => {
    const current = await readAppVersion();
    const next = bumpVersion(current, bump);
    const date = options.date ?? today();

    // Compute the stamped changelog first: stampChangelog throws when there is
    // no "## TBD" section, so we fail before touching any file.
    const changelog = await readFile(CHANGELOG_PATH, "utf-8");
    const stamped = stampChangelog(changelog, next, date);

    await writeAppVersion(next);
    await writeFile(CHANGELOG_PATH, stamped, "utf-8");

    console.log(`Prepared release v${next} (${date}).`);
    console.log(`  - packages/seed-bible/package.json: ${current} -> ${next}`);
    console.log(
      `  - CHANGELOG.md: "## TBD" -> "## v${next} — ${date}" (+ fresh TBD)`
    );
    console.log("");
    console.log("Next steps:");
    console.log("  1. Review the diff (git diff).");
    console.log("  2. Commit on develop and open a PR.");
    console.log(
      "  3. Merge develop -> main; the tag + GitHub Release publish automatically."
    );
  });

await program.parseAsync();
