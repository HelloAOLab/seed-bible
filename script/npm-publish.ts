import { program } from "commander";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  NPM_PACKAGES,
  publishVersion,
  replaceVersionField,
  type NpmChannel,
} from "./lib/npmPublish";

function isPublished(name: string, version: string): boolean {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return out.trim() === version;
  } catch {
    // `npm view` exits non-zero (E404) when the package or version doesn't exist.
    return false;
  }
}

program
  .name("npm-publish")
  .description(
    `Publishes ${NPM_PACKAGES.join(", ")} to npm. Expects the packages to be built already.`
  )
  .requiredOption(
    "--channel <channel>",
    '"alpha" (develop: next patch + -alpha.<build-number>) or "latest" (main: the package.json version as-is).'
  )
  .option(
    "--build-number <buildNumber>",
    "The build number appended to alpha versions. Required for --channel alpha."
  )
  .option(
    "--dry-run",
    "Packs and runs `npm publish --dry-run` without uploading anything."
  )
  .action(
    async (options: {
      channel: string;
      buildNumber?: string;
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

      const packDir = await mkdtemp(path.join(tmpdir(), "seed-bible-npm-"));
      try {
        // Stamp every version before packing anything: `pnpm pack` turns
        // `workspace:` references into the referenced package's version, which
        // must be the one being published alongside it.
        for (const pkg of packages) {
          await writeFile(
            pkg.file,
            replaceVersionField(pkg.original, pkg.version),
            "utf-8"
          );
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
          execFileSync("pnpm", ["pack", "--pack-destination", outDir], {
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
          execFileSync("npm", args, { stdio: "inherit" });
          console.log(
            `${options.dryRun ? "[dry run] " : ""}Published ${pkg.name}@${pkg.version} (${channel}).`
          );
        }
      } finally {
        for (const pkg of packages) {
          await writeFile(pkg.file, pkg.original, "utf-8");
        }
        await rm(packDir, { recursive: true, force: true });
      }
    }
  );

program.parseAsync().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
