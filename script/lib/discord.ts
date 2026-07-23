/**
 * Posts a release announcement to a Discord channel via an incoming webhook.
 *
 * Like the Telegram helper, this is a no-op when the webhook URL is missing, and
 * it logs failures rather than throwing — a failed announcement must never break
 * a release that has already been tagged and published.
 */

// Discord's hard limit for an embed description. We keep the rendered notes
// under this and link out to the full GitHub release when they don't fit.
export const DISCORD_DESCRIPTION_LIMIT = 4096;

// Seed Bible green, used as the embed's accent bar.
const EMBED_COLOR = 0x4caf50;

export interface DiscordReleaseOptions {
  /** The released version, without a leading "v" (e.g. "1.2.0"). */
  version: string;
  /** The release notes as markdown (a CHANGELOG section). */
  notes: string;
  /** The site link to surface in the announcement. */
  siteUrl: string;
  /** Optional link to the full GitHub release, used when notes are truncated. */
  releaseUrl?: string;
}

interface DiscordEmbed {
  title: string;
  url: string;
  description: string;
  color: number;
}

export interface DiscordWebhookPayload {
  username: string;
  embeds: DiscordEmbed[];
  // Suppress any @mentions that might appear inside the release notes.
  allowed_mentions: { parse: string[] };
}

// Appended directly to the cut text (no separating space/newline) when notes
// are truncated, so a mid-sentence cutoff reads as clearly intentional rather
// than looking like a rendering bug.
const TRUNCATION_ELLIPSIS = "…";

/**
 * Builds the webhook payload for a release announcement: an embed titled with
 * the version and linked to the site, whose description is the release notes
 * (truncated to fit Discord's limit, with an ellipsis marking the cutoff)
 * followed by a direct link to the site.
 */
export function buildReleaseEmbed(
  options: DiscordReleaseOptions
): DiscordWebhookPayload {
  const siteLink = `**[Open Seed Bible →](${options.siteUrl})**`;
  const footer = `\n\n${siteLink}`;
  const readMoreLine = options.releaseUrl
    ? `\n\n[read the full release notes](${options.releaseUrl})`
    : "";

  const notes = options.notes.trim();
  let description: string;
  if (notes.length + footer.length <= DISCORD_DESCRIPTION_LIMIT) {
    description = `${notes}${footer}`;
  } else {
    const budget =
      DISCORD_DESCRIPTION_LIMIT -
      footer.length -
      readMoreLine.length -
      TRUNCATION_ELLIPSIS.length;
    const truncated = notes.slice(0, budget).trimEnd();
    description = `${truncated}${TRUNCATION_ELLIPSIS}${readMoreLine}${footer}`;
  }

  return {
    username: "Seed Bible",
    embeds: [
      {
        title: `Seed Bible v${options.version} 🎉`,
        url: options.siteUrl,
        description,
        color: EMBED_COLOR,
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

/**
 * Posts a release announcement to Discord.
 *
 * No-ops (and resolves successfully) when `webhookUrl` is missing, so the caller
 * can pass optional configuration through without guarding. Failures are logged
 * but never thrown.
 */
export async function sendDiscordRelease(
  webhookUrl: string | undefined,
  options: DiscordReleaseOptions
): Promise<void> {
  if (!webhookUrl) {
    console.log("No Discord webhook configured — skipping announcement.");
    return;
  }

  const payload = buildReleaseEmbed(options);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `Failed to post Discord announcement (${response.status}): ${await response.text()}`
      );
    } else {
      console.log(
        `Posted release announcement for v${options.version} to Discord.`
      );
    }
  } catch (error) {
    console.error("DiscordError:", error);
  }
}
