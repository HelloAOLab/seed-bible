import { program } from "commander";
import { execFileSync, type ExecFileSyncOptions } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  NPM_PACKAGES,
  publishVersion,
  replaceVersionField,
  type NpmChannel,
} from "./lib/npmPublish";

const isWindows = process.platform === "win32";

/**
 * Runs `npm`/`pnpm`. On Windows they are `.cmd` shims, which Node can only
 * start through a shell; the shell joins the arguments into one string, so
 * they're quoted to keep paths with spaces intact. `"` and `%` aren't
 * escaped: none of the arguments passed here (package names, versions, the
 * temp folder) contain them.
 */
function run(
  command: string,
  args: string[],
  options: ExecFileSyncOptions = {}
): string {
  const output = execFileSync(
    command,
    isWindows ? args.map((arg) => `"${arg}"`) : args,
    { ...options, shell: isWindows, encoding: "utf-8" }
  );
  return output ?? "";
}

function isPublished(name: string, version: string): boolean {
  try {
    const out = run("npm", ["view", `${name}@${version}`, "version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return out.trim() === version;
  } catch (err) {
    // `npm view` fails with E404 when the package has never been published.
    // Anything else (no npm, no network) must not be mistaken for that.
    const stderr = (err as { stderr?: unknown }).stderr;
    if (String(stderr ?? "").includes("E404")) {
      return false;
    }
    throw err;
  }
}

program
  .name("npm-publish")
  .description(`Publishes ${NPM_PACKAGES.join(", ")} to npm.`)
  .requiredOption(
    "--channel <channel>",
    '"alpha" (develop: next patch + -alpha.<build-number>) or "latest" (main: the package.json version as-is).'
  )
  .option(
    "--build-number <buildNumber>",
    "The build number appended to alpha versions. Required for --channel alpha."
  )
  .option(
    "--build",
    "Builds the packages after setting their versions, so the built code reports the version being published. Without it, the packages must already be built."
  )
  .option(
    "--dry-run",
    "Packs and runs `npm publish --dry-run` without uploading anything."
  )
  .action(
    async (options: {
      channel: string;
      buildNumber?: string;
      build?: boolean;
      dryRun?: boolean;
    }) => {
      if (options.channel !== "alpha" && options.channel !== "latest") {
        throw new Error(
          `Unknown channel "${options.channel}": use "alpha" or "latest".`
        );
      }
      const channel: NpmChannel = options.channel;

      const packages = await Promise.all(
        NPM_PACKAGES.map(async (name) => {
          const file = path.resolve("packages", name, "package.json");
          const original = await readFile(file, "utf-8");
          const { version } = JSON.parse(original) as { version: string };
          return {
            name,
            dir: path.dirname(file),
            file,
            original,
            version: publishVersion(version, channel, options.buildNumber),
          };
        })
      );

      // Synchronous, so it can also run from a signal handler: without one,
      // Ctrl-C would leave the stamped versions in the tracked files.
      const restore = () => {
        for (const pkg of packages) {
          writeFileSync(pkg.file, pkg.original, "utf-8");
        }
      };
      const onSignal = (signal: NodeJS.Signals) => {
        restore();
        process.exit(signal === "SIGINT" ? 130 : 143);
      };
      process.once("SIGINT", onSignal);
      process.once("SIGTERM", onSignal);

      const packDir = await mkdtemp(path.join(tmpdir(), "seed-bible-npm-"));
      try {
        // Stamp every version before building or packing anything: the
        // builds bake the version into the code, and `pnpm pack` turns
        // `workspace:` references into the referenced package's version,
        // which must be the one being published alongside it.
        for (const pkg of packages) {
          await writeFile(
            pkg.file,
            replaceVersionField(pkg.original, pkg.version),
            "utf-8"
          );
        }

        if (options.build) {
          run("pnpm", ["build:seed-bible-package"], { stdio: "inherit" });
          run("pnpm", ["build:extension-tools"], { stdio: "inherit" });
        }

        for (const pkg of packages) {
          if (isPublished(pkg.name, pkg.version)) {
            console.log(
              `${pkg.name}@${pkg.version} is already published — skipping.`
            );
            continue;
          }

          // `pnpm pack` resolves `catalog:` and `workspace:` specifiers, which
          // npm can't; `npm publish` then handles auth and provenance.
          const outDir = path.join(packDir, pkg.name);
          run("pnpm", ["pack", "--pack-destination", outDir], {
            cwd: pkg.dir,
            stdio: "inherit",
          });
          const [tarball] = await readdir(outDir);
          if (!tarball) {
            throw new Error(`pnpm pack produced no tarball for ${pkg.name}.`);
          }
          const args = [
            "publish",
            path.join(outDir, tarball),
            "--tag",
            channel,
            "--access",
            "public",
          ];
          if (options.dryRun) {
            args.push("--dry-run");
          }
          run("npm", args, { stdio: "inherit" });
          console.log(
            `${options.dryRun ? "[dry run] " : ""}Published ${pkg.name}@${pkg.version} (${channel}).`
          );
        }
      } finally {
        restore();
        process.off("SIGINT", onSignal);
        process.off("SIGTERM", onSignal);
        await rm(packDir, { recursive: true, force: true });
      }
    }
  );

program.parseAsync().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
