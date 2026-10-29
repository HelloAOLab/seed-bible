/**
 * What an imported web page says about itself: the same Open Graph details
 * a link preview reads, plus its author, an embedded video and its main
 * text. The text is only used to find the passages it names; it's never
 * stored. Plain pattern matching over the HTML, since the worker has no DOM.
 */

/** Most characters of main text kept for finding passages. */
export const MAX_PAGE_TEXT = 20_000;
/** A description made from the page's text, when it has none of its own. */
const TEXT_DESCRIPTION_LENGTH = 300;

export interface ExtractedPage {
  title: string;
  description: string;
  image?: string;
  author?: string;
  /** A YouTube or Vimeo video embedded in the page. */
  mediaUrl?: string;
  text: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  copy: "©",
};

export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1] === "x" || body[1] === "X"
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : entity;
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
    }
  );
}

function attributes(tag: string): Map<string, string> {
  const found = new Map<string, string>();
  const pattern =
    /([^\s=/<>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  // Skip the tag name itself.
  pattern.exec(tag);
  while ((match = pattern.exec(tag)) !== null) {
    found.set(
      match[1]!.toLowerCase(),
      decodeEntities(match[2] ?? match[3] ?? match[4] ?? "")
    );
  }
  return found;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function absolute(url: string | undefined, base: string): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const resolved = new URL(url, base);
    return resolved.protocol === "https:" || resolved.protocol === "http:"
      ? resolved.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Every value of `key` in the page's JSON-LD blocks, outermost first. */
function jsonLdValues(html: string, key: string): unknown[] {
  const values: unknown[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 6 || !node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, depth + 1));
      return;
    }
    const record = node as Record<string, unknown>;
    if (key in record) {
      values.push(record[key]);
    }
    Object.values(record).forEach((child) => visit(child, depth + 1));
  };
  for (const match of html.matchAll(
    /<script[^>]+type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      visit(JSON.parse(match[1]!), 0);
    } catch {
      // A broken block is just skipped.
    }
  }
  return values;
}

function personName(value: unknown): string | undefined {
  if (typeof value === "string") {
    return collapse(value) || undefined;
  }
  if (Array.isArray(value)) {
    return personName(value[0]);
  }
  if (value && typeof value === "object") {
    return personName((value as { name?: unknown }).name);
  }
  return undefined;
}

/** A canonical link for a YouTube or Vimeo embed, or undefined for anything else. */
export function embeddedVideoUrl(
  src: string,
  base: string
): string | undefined {
  const url = absolute(src, base);
  if (!url) {
    return undefined;
  }
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = /^\/embed\/([\w-]{6,})/.exec(parsed.pathname)?.[1];
    return id ? `https://www.youtube.com/watch?v=${id}` : undefined;
  }
  if (host === "player.vimeo.com") {
    const id = /^\/video\/(\d+)/.exec(parsed.pathname)?.[1];
    return id ? `https://vimeo.com/${id}` : undefined;
  }
  return undefined;
}

const NOISE_BLOCKS = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "iframe",
];

/** The page's main text: its article (or main section, or body) without menus, footers and scripts. */
function mainText(html: string): { text: string; region: string } {
  let cleaned = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of NOISE_BLOCKS) {
    cleaned = cleaned.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      " "
    );
  }
  const region =
    /<article\b[^>]*>([\s\S]*?)<\/article\s*>/i.exec(cleaned)?.[1] ??
    /<main\b[^>]*>([\s\S]*?)<\/main\s*>/i.exec(cleaned)?.[1] ??
    /<body\b[^>]*>([\s\S]*)/i.exec(cleaned)?.[1] ??
    cleaned;
  const text = decodeEntities(
    region
      .replace(
        /<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/blockquote)\b[^>]*>/gi,
        "\n"
      )
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map(collapse)
    .filter(Boolean)
    .join("\n");
  return { text: text.slice(0, MAX_PAGE_TEXT), region };
}

/** Reads a saved page. `url` is the page's own address, for resolving relative links. */
export function extractPage(html: string, url: string): ExtractedPage {
  const meta = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (
      attrs.get("property") ??
      attrs.get("name") ??
      ""
    ).toLowerCase();
    const content = attrs.get("content");
    if (key && content && !meta.has(key)) {
      meta.set(key, collapse(content));
    }
  }
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html)?.[1];
  const { text, region } = mainText(html);

  let mediaUrl: string | undefined;
  for (const match of html.matchAll(/<iframe\b[^>]*>/gi)) {
    mediaUrl = embeddedVideoUrl(attributes(match[0]).get("src") ?? "", url);
    if (mediaUrl) {
      break;
    }
  }

  const firstImage = /<img\b[^>]*>/i.exec(region)?.[0];
  const image = absolute(
    meta.get("og:image") ??
      meta.get("twitter:image") ??
      (firstImage ? attributes(firstImage).get("src") : undefined),
    url
  );

  const author =
    personName(jsonLdValues(html, "author")[0]) ??
    // `article:author` is often a profile link rather than a name.
    [meta.get("author"), meta.get("article:author")].find(
      (value) => value && !/^https?:\/\//i.test(value)
    );

  let description =
    meta.get("og:description") ??
    meta.get("description") ??
    meta.get("twitter:description") ??
    "";
  if (!description && text) {
    const flat = collapse(text);
    description =
      flat.length > TEXT_DESCRIPTION_LENGTH
        ? `${flat.slice(0, TEXT_DESCRIPTION_LENGTH - 1).trimEnd()}…`
        : flat;
  }

  return {
    title:
      meta.get("og:title") ??
      meta.get("twitter:title") ??
      (titleTag ? collapse(decodeEntities(titleTag)) : ""),
    description,
    ...(image ? { image } : {}),
    ...(author ? { author } : {}),
    ...(mediaUrl ? { mediaUrl } : {}),
    text,
  };
}
