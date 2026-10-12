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
  image?: { url: string };
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

// Markdown images (`![alt](url)`) and the `<img … src="…">` tags GitHub inserts
// when a file is dropped into a comment box. Group 1 is the markdown URL.
const IMAGE_PATTERN = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img\b[^>]*>/gi;
const IMG_SRC_PATTERN = /\bsrc\s*=\s*["']([^"']+)["']/i;

const HIGHLIGHTS_HEADING = /^###\s.*\bHighlights\s*$/i;

// Discord only renders `#` to `###` headings, so deeper ones (the `####`
// highlight titles) would show their `#`s literally.
const DEEP_HEADING = /^#{4,}\s+(.+?)\s*$/;

/**
 * Rewrites the notes into markdown an embed description can show: images
 * (which would appear as raw markup) are removed along with the blank lines
 * they leave behind, and headings Discord can't render become bold lines.
 */
function toDiscordMarkdown(notes: string): string {
  return notes
    .replace(IMAGE_PATTERN, "")
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "";
      const heading = DEEP_HEADING.exec(line);
      return heading ? `**${heading[1]}**` : line;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The URL of the first real image in the notes' Highlights section, if any.
 * Placeholders that haven't been swapped for an uploaded image yet (anything
 * that isn't an http(s) URL, like `(TODO)`) are skipped.
 */
function findHighlightImage(notes: string): string | undefined {
  const lines = notes.split("\n");
  const start = lines.findIndex((line) => HIGHLIGHTS_HEADING.test(line));
  if (start === -1) return undefined;

  let end = start + 1;
  while (end < lines.length && !/^#{2,3}\s/.test(lines[end]!)) {
    end++;
  }
  const highlights = lines.slice(start + 1, end).join("\n");

  for (const match of highlights.matchAll(IMAGE_PATTERN)) {
    const url = match[1] ?? IMG_SRC_PATTERN.exec(match[0])?.[1];
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return undefined;
}

/**
 * Builds the webhook payload for a release announcement: an embed titled with
 * the version and linked to the site, whose description is the release notes
 * in markdown Discord can render (truncated to fit Discord's limit, with an ellipsis
 * marking the cutoff) followed by a direct link to the site. The first
 * Highlights image, when there is one, becomes the embed's image.
 */
export function buildReleaseEmbed(
  options: DiscordReleaseOptions
): DiscordWebhookPayload {
  const siteLink = `**[Open Seed Bible →](${options.siteUrl})**`;
  const footer = `\n\n${siteLink}`;
  const readMoreLine = options.releaseUrl
    ? `\n\n[read the full release notes](${options.releaseUrl})`
    : "";

  const notes = toDiscordMarkdown(options.notes);
  const imageUrl = findHighlightImage(options.notes);
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
        title: `Release: Seed Bible v${options.version} 🎉`,
        url: options.releaseUrl || options.siteUrl,
        description,
        color: EMBED_COLOR,
        ...(imageUrl ? { image: { url: imageUrl } } : {}),
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
