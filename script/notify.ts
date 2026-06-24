import { program } from "commander";
import { sendTelegramMessage, telegramTimestamp } from "./lib/telegram";

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

program.parse();
