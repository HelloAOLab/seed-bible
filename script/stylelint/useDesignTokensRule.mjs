import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import stylelint from "stylelint";

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

export const ruleName = "seed-bible/use-design-tokens";

export const messages = ruleMessages(ruleName, {
  rawValue: (raw, token, scales) =>
    `"${raw}" has a name: use var(${token}) so it follows the shared scale.` +
    (scales
      ? " The token is in rem, so unlike this px value it grows with UI Size."
      : ""),
});

/**
 * The token names and values, read from `sharedTokens.ts` (the copy sandboxed
 * extension frames get) rather than kept as a third list here. Parsed as text
 * because stylelint loads this file as plain JavaScript.
 */
export function readSharedTokens() {
  // A path, not `new URL(...)`: under jsdom (the unit tests) the global URL is
  // jsdom's, which `fs` doesn't accept.
  const source = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../packages/seed-bible/seed-bible/app/styles/sharedTokens.ts"
    ),
    "utf8"
  );
  const tokens = {};
  for (const m of source.matchAll(/"(--sb-[\w-]+)":\s*"([^"]+)"/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

const PX_PER_REM = 16;

/** "0.5rem" and "8px" both → 8; anything else → null. */
function toPx(value) {
  const m = /^(\d*\.?\d+)(rem|px)$/.exec(value);
  if (!m) return null;
  return m[2] === "rem" ? parseFloat(m[1]) * PX_PER_REM : parseFloat(m[1]);
}

/** "0.15s" and "150ms" both → 150; anything else → null. */
function toMs(value) {
  const m = /^(\d*\.?\d+)(m?s)$/i.exec(value);
  if (!m) return null;
  return m[2].toLowerCase() === "ms"
    ? parseFloat(m[1])
    : Math.round(parseFloat(m[1]) * 1000);
}

function squash(value) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Every token family: its name prefix, and how a raw value is put in the same
 * form as the token's so the two can be compared. `propKind` says which CSS
 * properties each family covers. The shared-tokens unit test reads this list
 * too, so a family missing here fails there.
 */
export const TOKEN_FAMILIES = {
  radius: { prefix: "--sb-radius-", normalize: toPx },
  layer: { prefix: "--sb-layer-", normalize: (v) => v.trim() },
  duration: { prefix: "--sb-duration-", normalize: toMs },
  fontSize: { prefix: "--sb-font-size-", normalize: toPx },
  shadow: { prefix: "--sb-shadow-", normalize: squash },
  backdrop: {
    prefix: "--sb-backdrop",
    normalize: (v) => v.replace(/\s+/g, "").toLowerCase(),
  },
};

// Shares the shadow prefix, but it's the theme's color, not a token.
const NOT_TOKENS = new Set(["--sb-shadow-color"]);

/** The family a `--sb-*` name belongs to, or null if it isn't a token. */
export function tokenFamily(name) {
  if (NOT_TOKENS.has(name)) return null;
  for (const [kind, { prefix }] of Object.entries(TOKEN_FAMILIES)) {
    if (name.startsWith(prefix)) return kind;
  }
  return null;
}

function buildLookups(tokens) {
  const lookups = {};
  for (const kind of Object.keys(TOKEN_FAMILIES)) lookups[kind] = new Map();
  for (const [name, value] of Object.entries(tokens)) {
    const kind = tokenFamily(name);
    if (kind) lookups[kind].set(TOKEN_FAMILIES[kind].normalize(value), name);
  }
  return lookups;
}

/**
 * Splits a value into its top-level words and commas. Anything inside
 * parentheses (calc(), var() fallbacks, cubic-bezier()) stays part of one
 * word, so it never matches a bare length or time.
 */
function topLevelParts(value) {
  const parts = [];
  let depth = 0;
  let word = "";
  const flush = () => {
    if (word) parts.push({ type: "word", value: word });
    word = "";
  };
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && /\s/.test(ch)) flush();
    else if (depth === 0 && ch === ",") {
      flush();
      parts.push({ type: "comma" });
    } else word += ch;
  }
  flush();
  return parts;
}

// Icons are drawn with a font, so their size is a `font-size` too, but it's
// an icon size rather than a text size and isn't on the text scale. Matched as
// a whole word of the selector, so `.sb-narrow` or `.lexicon` don't count.
const ICON_SELECTOR =
  /(^|[^a-z0-9])(icon|material-symbols|glyph|emoji|chevron|caret|arrow)s?([^a-z0-9]|$)/i;

function propKind(prop) {
  const p = prop.toLowerCase();
  if (/-radius$/.test(p)) return "radius";
  if (p === "z-index" || /-z-index$/.test(p)) return "layer";
  if (/^(transition|animation)(-duration)?$/.test(p)) return "duration";
  if (p === "font-size" || /-font-size$/.test(p)) return "fontSize";
  if (p === "font") return "font";
  if (p === "box-shadow" || /-box-shadow$/.test(p)) return "shadow";
  if (p === "background" || p === "background-color") return "backdrop";
  return null;
}

function insideKeyframes(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === "atrule" && /keyframes$/i.test(p.name)) return true;
  }
  return false;
}

/**
 * Words in the value that should be a token, as [raw, token] pairs. Only
 * exact matches count: an off-scale value may be deliberate (a badge sized to
 * its circle, a looping animation), so it's left alone.
 */
function findRawTokens(kind, decl, lookups) {
  const value = decl.value;
  if (kind === "shadow") {
    const token = lookups.shadow.get(squash(value));
    return token ? [[squash(value), token]] : [];
  }
  if (kind === "layer") {
    const token = lookups.layer.get(value.trim());
    return token ? [[value.trim(), token]] : [];
  }
  if (kind === "backdrop") {
    const token = lookups.backdrop.get(
      TOKEN_FAMILIES.backdrop.normalize(value)
    );
    return token ? [[value.trim(), token]] : [];
  }
  if (kind === "fontSize" || kind === "font") {
    const selector = decl.parent?.selector ?? "";
    if (ICON_SELECTOR.test(selector)) return [];
  }

  const hits = [];
  const parts = topLevelParts(value);
  if (kind === "font") {
    // `font: 600 0.875rem/1.2 sans-serif`: the size is the first length, and
    // the part before a `/` (the rest is the line height).
    for (const part of parts) {
      if (part.type !== "word") continue;
      const size = part.value.split("/")[0];
      if (toPx(size) === null) continue;
      const token = lookups.fontSize.get(toPx(size));
      return token ? [[size, token]] : [];
    }
    return [];
  }
  if (kind === "duration") {
    const shorthand = !decl.prop.toLowerCase().endsWith("-duration");
    let group = [];
    const groups = [group];
    for (const part of parts) {
      if (part.type === "comma") groups.push((group = []));
      else group.push(part);
    }
    for (const words of groups) {
      const times = words.filter((w) => toMs(w.value) !== null);
      // In a shorthand only the first time is the duration; the second is a delay.
      for (const n of shorthand ? times.slice(0, 1) : times) {
        const token = lookups.duration.get(toMs(n.value));
        if (token) hits.push([n.value, token]);
      }
    }
    return hits;
  }

  // Radius and font-size: only top-level words, so values inside calc() or a
  // var() fallback (which are already computed or already named) are skipped.
  const lookup = kind === "radius" ? lookups.radius : lookups.fontSize;
  for (const part of parts) {
    if (part.type !== "word") continue;
    const token = lookup.get(toPx(part.value));
    if (token) hits.push([part.value, token]);
  }
  return hits;
}

// Built on first use and kept: stylelint calls the rule once per file. A
// long-running stylelint (an editor extension) needs a restart to see a
// changed token.
let tokens;
let lookups;

/** @type {import("stylelint").Rule} */
const rule = (primary) => {
  tokens ??= readSharedTokens();
  lookups ??= buildLookups(tokens);
  return (root, result) => {
    if (!validateOptions(result, ruleName, { actual: primary })) return;

    root.walkDecls((decl) => {
      const kind = propKind(decl.prop);
      if (!kind || insideKeyframes(decl)) return;
      // The token definitions themselves.
      if (tokenFamily(decl.prop)) return;
      for (const [raw, token] of findRawTokens(kind, decl, lookups)) {
        const scales = /px$/.test(raw) && /rem$/.test(tokens[token] ?? "");
        report({
          ruleName,
          result,
          node: decl,
          word: raw,
          message: messages.rawValue(raw, token, scales),
        });
      }
    });
  };
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = {
  url: "https://github.com/HelloAOLab/seed-bible/blob/develop/script/stylelint/useDesignTokensRule.mjs",
};

export default createPlugin(ruleName, rule);
