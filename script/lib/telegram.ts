type TelegramParseMode = "Markdown" | "MarkdownV2" | "HTML";

/**
 * Sends a message to a Telegram chat via the Telegram Bot API.
 *
 * This is a no-op (and resolves successfully) when either the bot token or the
 * chat ID is missing, so callers can pass through optional configuration without
 * guarding the call site. Failures are logged but never thrown — a notification
 * failure should not break the surrounding workflow.
 *
 * @param botToken The Telegram bot token. If missing, no message is sent.
 * @param chatId The Telegram chat ID. If missing, no message is sent.
 * @param message The message text to send.
 * @param parseMode The parse mode to use for the message. If not specified, the message is sent as plain text.
 */
export async function sendTelegramMessage(
  botToken: string | undefined,
  chatId: string | undefined,
  message: string,
  parseMode?: TelegramParseMode
): Promise<void> {
  if (!botToken || !chatId) {
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const params: Record<string, string> = {
    chat_id: chatId,
    text: message,
  };
  if (parseMode) {
    params.parse_mode = parseMode;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error(
        `Failed to send Telegram message (${response.status}): ${await response.text()}`
      );
    }
  } catch (error) {
    console.error("TelegramError:", error);
  }
}

/**
 * Formats the given date as the `date`/`time` fields used in Telegram
 * notification messages.
 * @param now The date to format. Defaults to the current time.
 */
export function telegramTimestamp(now: Date = new Date()): {
  date: string;
  time: string;
} {
  const iso = now.toISOString();
  const date = iso.split("T")[0]!; // YYYY-MM-DD
  const time = iso.split("T")[1]!.split(".")[0] + " UTC"; // HH:MM:SS UTC
  return { date, time };
}
