import { program } from "commander";
import { readFile, rmdir, cp, readdir } from "node:fs/promises";
import { downloadAndSave, uploadPattern } from "./lib/pattern";
import { uploadFile, getCurrentSessionKey } from "./lib/records";
import path from "node:path";
import { execSync } from "node:child_process";
import { uploadAll } from "./lib/extension";
import os from "node:os";
import { existsSync } from "node:fs";
import type { StoredAuxVersion1 } from "@casual-simulation/aux-common";

const packageNameMap = new Map([["SeedBible", "seed-bible"]]);

program
  .name("pattern")
  .description("Commands for working with AUX patterns.")
  .version("0.1.0");

program
  .command("pack")
  .description(
    "Packs the given pattern into an AUX file in the pattern-dist folder. The AUX file will be named <pattern>.aux."
  )
  .argument("<name>", "The name of the pattern to pack.")
  .action(async (name) => {
    const patternPath = path.resolve("patterns", name);
    const distPath = path.resolve("pattern-dist");
    const filePath = path.resolve(distPath, `${name}.aux`);
    execSync(`casualos pack-aux --overwrite "${patternPath}" "${filePath}"`, {
      stdio: "inherit",
    });
    execSync(`casualos minify-aux "${filePath}"`, { stdio: "inherit" });
    console.log(`Packed pattern ${name} to ${filePath}.`);
  });

program
  .command("pack-all")
  .description(
    "Packs all patterns into AUX files in the pattern-dist folder. Each AUX file will be named <pattern>.aux."
  )
  .action(async () => {
    const list = await readdir("patterns");
    const patterns: string[] = [];
    for (const name of list) {
      if (existsSync(path.resolve("patterns", name, "extension.json"))) {
        patterns.push(name);
      }
    }
    const distPath = path.resolve("pattern-dist");

    for (const name of patterns) {
      const patternPath = path.resolve("patterns", name);
      const filePath = path.resolve(distPath, `${name}.aux`);
      execSync(`casualos pack-aux --overwrite "${patternPath}" "${filePath}"`, {
        stdio: "ignore",
      });
      execSync(`casualos minify-aux "${filePath}"`, { stdio: "inherit" });
      console.log(`Packed pattern ${name} to ${filePath}.`);
    }
  });

program
  .command("publish")
  .description("Publishes the given pattern to the records server.")
  .argument("<package>", "The name of the package to upload.")
  .option("-p, --pattern <pattern>", "The name of the pattern to upload.")
  .option(
    "--session-key <sessionKey>",
    "The session key to use for authentication."
  )
  .option(
    "--record-key <recordKey>",
    "The record key to use. If not specified, the default record name will be used."
  )
  .option(
    "--telegram-bot-token <telegramBotToken>",
    "The Telegram bot token to use for sending upload notifications to Telegram. If not specified, then notifications won't be sent to Telegram."
  )
  .option(
    "--telegram-chat-id <telegramChatId>",
    "The Telegram chat ID to use for sending upload notifications to Telegram. If not specified, then notifications won't be sent to Telegram."
  )
  .action(async (name, options) => {
    if (!options.sessionKey) {
      throw new Error(
        "You must specify a session key using the --session-key option."
      );
    }
    const packagePath = path.resolve("packages", name);
    console.log("Packaging:", packagePath);
    const filePath = path.resolve("dist", `${name}.aux`);
    execSync(`casualos pack-aux --overwrite "${packagePath}" "${filePath}"`, {
      stdio: "inherit",
    });
    execSync(`casualos minify-aux "${filePath}"`, { stdio: "inherit" });
    const aux = await readFile(filePath, "utf-8");
    const auxJson = JSON.parse(aux);
    await uploadPattern(
      options.pattern || name,
      auxJson,
      options.sessionKey,
      options.recordKey,
      options.telegramBotToken,
      options.telegramChatId
    );
  });

program
  .command("publish-seed-bible")
  .description("Publishes the Seed Bible pattern with all the extensions.")
  .option("-p, --pattern <pattern>", "The name of the pattern to upload.")
  .option(
    "--session-key <sessionKey>",
    "The session key to use for authentication."
  )
  .option(
    "--record-key <recordKey>",
    "The record key to use. If not specified, the default record name will be used."
  )
  .option(
    "--ext-record-key <extRecordKey>",
    "The record key to use for extensions. If not specified, the default record name will be used."
  )
  .option(
    "--no-save-meta",
    "Whether to skip saving the extension metadata to the records server. Defaults to true.",
    true
  )
  .option(
    "--telegram-bot-token <telegramBotToken>",
    "The Telegram bot token to use for sending upload notifications to Telegram. If not specified, then notifications won't be sent to Telegram."
  )
  .option(
    "--telegram-chat-id <telegramChatId>",
    "The Telegram chat ID to use for sending upload notifications to Telegram. If not specified, then notifications won't be sent to Telegram."
  )
  .action(async (options) => {
    if (!options.pattern) {
      throw new Error("You must specify a pattern using the --pattern option.");
    }
    if (!options.sessionKey) {
      throw new Error(
        "You must specify a session key using the --session-key option."
      );
    }

    const extensions = await uploadAll({
      ...options,
      recordKey: options.extRecordKey ?? options.recordKey,
    });

    const name = "seed-bible";
    const packagePath = path.resolve("packages", name);
    console.log("Packaging:", packagePath);
    const filePath = path.resolve("dist", `${name}.aux`);
    execSync(`casualos pack-aux --overwrite "${packagePath}" "${filePath}"`, {
      stdio: "inherit",
    });
    execSync(`casualos minify-aux "${filePath}"`, { stdio: "inherit" });
    const aux = await readFile(filePath, "utf-8");
    const auxJson: StoredAuxVersion1 = JSON.parse(aux);

    const bots = Object.values(auxJson.state);
    const managers = bots.find((b) => b.tags.system === "seed-bible.managers");
    if (!managers) {
      throw new Error(
        "No seed-bible.managers bot found in the Seed Bible AUX."
      );
    }

    managers.tags.availableExtensions = extensions;

    await uploadPattern(
      options.pattern,
      auxJson,
      options.sessionKey,
      options.recordKey,
      options.telegramBotToken,
      options.telegramChatId
    );
  });

program
  .command("upload")
  .description("Uploads the given file to the records server.")
  .argument(
    "<recordKeyOrName>",
    "The record key or name to upload the file to."
  )
  .argument("<file>", "The path to the file to upload.")
  .option(
    "--session-key <sessionKey>",
    "The session key to use for authentication."
  )
  .option(
    "--record-key <recordKey>",
    "The record key to use. If not specified, the default record name will be used."
  )
  .option(
    "--markers <markers...>",
    "The markers to use for the uploaded file.",
    (val) => val.split(",")
  )
  .action(async (recordKeyOrName, file, options) => {
    if (!options.sessionKey) {
      options.sessionKey = await getCurrentSessionKey();
      if (!options.sessionKey) {
        throw new Error(
          "You must specify a session key either by using the --session-key option or by logging into the casualos CLI for https://api.ao.bot."
        );
      }
    }
    const data = await readFile(path.resolve(file));
    const { fileUrl } = await uploadFile(
      recordKeyOrName,
      data,
      options.sessionKey,
      options.markers
    );
    console.log("File uploaded to:", fileUrl);
  });

program.parse();
