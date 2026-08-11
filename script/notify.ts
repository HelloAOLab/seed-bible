import { program } from "commander";
import { readFile } from "node:fs/promises";
import { sendTelegramMessage, telegramTimestamp } from "./lib/telegram";
import { sendDiscordRelease } from "./lib/discord";

program.name("notify").description("Commands for sending notifications.");

program
  .command("deployment")
  .description("Sends a deployment notification to Telegram.")
  .requiredOption("--branch <branch>", "The branch that was deployed.")
  .requiredOption("--url <url>", "The URL the branch can be accessed at.")
  .requiredOption(
    "--version <version>",
    "The build ID / version that was deployed."
  )
  .option(
    "--telegram-bot-token <telegramBotToken>",
    "The Telegram bot token to use. Defaults to the TELEGRAM_BOT_TOKEN environment variable. If missing, no notification is sent.",
    process.env.TELEGRAM_BOT_TOKEN
  )
  .option(
    "--telegram-chat-id <telegramChatId>",
    "The Telegram chat ID to use. Defaults to the TELEGRAM_CHAT_ID environment variable. If missing, no notification is sent.",
    process.env.TELEGRAM_CHAT_ID
  )
  .action(async (options) => {
    const { date, time } = telegramTimestamp();
    const message = `action: deployment\ndate: ${date}\ntime: ${time}\nbranch: ${options.branch}\nurl: ${options.url}\nversion: ${options.version}`;
    await sendTelegramMessage(
      options.telegramBotToken,
      options.telegramChatId,
      message
    );
  });

program
  .command("discord-release")
  .description(
    "Posts a release announcement to Discord via an incoming webhook."
  )
  .requiredOption(
    "--version <version>",
    "The released version (a leading 'v' is ignored)."
  )
  .requiredOption(
    "--notes-file <path>",
    "Path to a file containing the release notes (markdown)."
  )
  .option(
    "--site-url <url>",
    "The site link to include in the announcement.",
    "https://seedbible.org"
  )
  .option(
    "--release-url <url>",
    "Link to the full GitHub release, used when the notes are truncated."
  )
  .option(
    "--webhook <url>",
    "Discord webhook URL. Defaults to the DISCORD_ANNOUNCE_WEBHOOK environment variable. If missing, nothing is posted.",
    process.env.DISCORD_ANNOUNCE_WEBHOOK
  )
  .action(async (options) => {
    const version = options.version.startsWith("v")
      ? options.version.slice(1)
      : options.version;
    const notes = await readFile(options.notesFile, "utf-8");
    await sendDiscordRelease(options.webhook, {
      version,
      notes,
      siteUrl: options.siteUrl,
      releaseUrl: options.releaseUrl,
    });
  });

await program.parseAsync();
