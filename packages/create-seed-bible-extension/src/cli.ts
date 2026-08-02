#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { scaffoldExtension } from "./scaffold.js";

const program = new Command();

program
  .name("create-seed-bible-extension")
  .description("Scaffold a new Seed Bible extension project.")
  .argument("<name>", "name for the extension (also used as its id)")
  .argument("[directory]", "directory to create it in (defaults to <name>)")
  .action(async (name: string, directory: string | undefined) => {
    const targetDir = path.resolve(directory ?? name);
    try {
      await scaffoldExtension({ name, targetDir });
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
      return;
    }

    console.log(`\nScaffolded a new extension in ${targetDir}\n`);
    console.log("Next steps:");
    console.log(`  cd ${path.relative(process.cwd(), targetDir) || "."}`);
    console.log("  npm install");
    console.log("  npm run dev");
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
