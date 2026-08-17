/**
 * Routing image URLs written in `<meta content="...">` through Vite's asset
 * pipeline.
 *
 * Vite rewrites asset URLs in the HTML entry for a fixed set of tag/attribute
 * pairs — `link[href]`, `img[src|srcset]`, `source`, `video`, and two SVG ones.
 * `meta[content]` is not among them, so `index.html`'s `og:image` was left
 * verbatim and its file was never emitted: the social preview pointed at
 * `/standalone/img/...`, a path that exists only in the repo (`publicDir` is
 * off, so nothing copies it into the build) and 404s in production.
 *
 * Rather than re-implement emitting, hashing and base-prefixing, the transform
 * borrows the machinery that already works. Before Vite reads the HTML, each
 * targeted meta's path is copied onto a carrier `<link>`; Vite rewrites that
 * `href` exactly as it does the favicon's; afterwards the rewritten value is
 * copied back into the meta and the carrier is deleted.
 *
 * Pure string functions so `test/unit/script/lib/htmlMetaAssets.test.ts` can pin
 * them down without running a build.
 */

/** Meta tags whose `content` names an image that should be built like an asset. */
export const META_ASSET_KEYS = [
  "og:image",
  "og:image:secure_url",
  "twitter:image",
];

/**
 * The carrier's `rel`. Deliberately not a real one: `preload` would work just as
 * well for the build, but it also makes browsers download the 1200x630 social
 * image on every page load. A rel no browser knows is ignored, and the tag is
 * removed before the HTML ships anyway.
 */
const CARRIER_REL = "seed-bible-meta-asset";

const META_TAG_RE = /<meta\b[^>]*>/gi;
const LINK_TAG_RE = /<link\b[^>]*>/gi;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|svg|webp|avif|ico)(\?[^#]*)?(#.*)?$/i;

function readAttr(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`,
    "i"
  ).exec(tag);
  if (!match) return null;
  return match[2] ?? match[3] ?? null;
}

function setAttr(tag: string, name: string, value: string): string {
  const escaped = value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return tag.replace(
    new RegExp(`(\\b${name}\\s*=\\s*)("[^"]*"|'[^']*')`, "i"),
    (_match, prefix: string) => `${prefix}"${escaped}"`
  );
}

/** The `property` or `name` a meta tag is identified by, lowercased. */
function metaKey(tag: string): string | null {
  const key = readAttr(tag, "property") ?? readAttr(tag, "name");
  return key ? key.toLowerCase() : null;
}

/**
 * Whether a `content` value names a file in this repo (as opposed to a remote
 * URL or an inline data URI) that Vite should emit.
 */
export function isLocalAssetPath(value: string): boolean {
  if (!value) return false;
  // Any scheme — `https:`, `data:` — and protocol-relative URLs are already
  // wherever they are going to be served from.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//"))
    return false;
  if (!value.startsWith("/") && !value.startsWith("./")) return false;
  return IMAGE_EXT_RE.test(value);
}

/**
 * Adds one carrier `<link>` per targeted meta tag, so Vite emits the file and
 * rewrites the URL. Run before Vite reads the HTML.
 */
export function injectMetaAssetCarriers(html: string): string {
  const carriers: string[] = [];
  const seen = new Set<string>();

  for (const [tag] of html.matchAll(META_TAG_RE)) {
    const key = metaKey(tag);
    if (!key || !META_ASSET_KEYS.includes(key)) continue;

    const content = readAttr(tag, "content");
    if (!content || !isLocalAssetPath(content) || seen.has(key)) continue;

    seen.add(key);
    carriers.push(
      `<link rel="${CARRIER_REL}" data-meta-asset="${key}" href="${content}">`
    );
  }

  if (carriers.length === 0) return html;

  const block = carriers.join("\n");
  return /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, () => `${block}\n</head>`)
    : `${html}\n${block}`;
}

export interface ResolveMetaAssetOptions {
  /**
   * Origin used to absolutize a URL Vite left root-relative. Only reached when
   * `base` is `/` — a plain local build — since a deployed build's `base` is
   * already the absolute CDN root.
   */
  siteOrigin: string;
}

/**
 * Copies each carrier's rewritten `href` into its meta tag's `content` and
 * removes the carriers. Run after Vite has processed the HTML.
 *
 * The value may still be a `__VITE_ASSET__<hash>__` placeholder depending on
 * when the html plugin resolves those relative to this hook. That is fine: the
 * resolution pass is a global replace over the whole document, so a copied
 * placeholder resolves along with the original. It is also why absolutizing
 * keys off a leading `/` — a placeholder has none, so it is passed through
 * untouched and picks up the absolute `base` when it is resolved.
 */
export function resolveMetaAssetCarriers(
  html: string,
  options: ResolveMetaAssetOptions
): string {
  const origin = options.siteOrigin.replace(/\/+$/, "");
  const resolved = new Map<string, string>();

  const withoutCarriers = html.replace(LINK_TAG_RE, (tag) => {
    const key = readAttr(tag, "data-meta-asset")?.toLowerCase();
    if (!key) return tag;

    const href = readAttr(tag, "href");
    if (href) {
      resolved.set(
        key,
        href.startsWith("/") && !href.startsWith("//")
          ? `${origin}${href}`
          : href
      );
    }
    return "";
  });

  if (resolved.size === 0) return html;

  return withoutCarriers.replace(META_TAG_RE, (tag) => {
    const key = metaKey(tag);
    const url = key ? resolved.get(key) : undefined;
    return url ? setAttr(tag, "content", url) : tag;
  });
}
