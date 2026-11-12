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
  rawValue: (raw, token) =>
    `"${raw}" has a name: use var(${token}) so it follows the shared scale.`,
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

function buildLookups(tokens) {
  const radius = new Map();
  const layer = new Map();
  const duration = new Map();
  const fontSize = new Map();
  const shadow = new Map();
  for (const [name, value] of Object.entries(tokens)) {
    if (name.startsWith("--sb-radius-")) radius.set(toPx(value), name);
    else if (name.startsWith("--sb-layer-")) layer.set(value, name);
    else if (name.startsWith("--sb-duration-")) duration.set(toMs(value), name);
    else if (name.startsWith("--sb-font-size-"))
      fontSize.set(toPx(value), name);
    else if (name.startsWith("--sb-shadow-")) shadow.set(squash(value), name);
  }
  return { radius, layer, duration, fontSize, shadow };
}

function squash(value) {
  return value.replace(/\s+/g, " ").trim();
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
// an icon size rather than a text size and isn't on the text scale.
const ICON_SELECTOR = /icon|material-symbols|glyph|emoji|chevron|caret|arrow/i;

function propKind(prop) {
  const p = prop.toLowerCase();
  if (/-radius$/.test(p)) return "radius";
  if (p === "z-index" || /-z-index$/.test(p)) return "layer";
  if (/^(transition|animation)(-duration)?$/.test(p)) return "duration";
  if (p === "font-size" || /-font-size$/.test(p)) return "fontSize";
  if (p === "box-shadow" || /-box-shadow$/.test(p)) return "shadow";
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
  if (kind === "fontSize") {
    const selector = decl.parent?.selector ?? "";
    if (ICON_SELECTOR.test(selector)) return [];
  }

  const hits = [];
  const parts = topLevelParts(value);
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

/** @type {import("stylelint").Rule} */
const rule = (primary) => {
  const lookups = buildLookups(readSharedTokens());
  return (root, result) => {
    if (!validateOptions(result, ruleName, { actual: primary })) return;

    root.walkDecls((decl) => {
      const kind = propKind(decl.prop);
      if (!kind || insideKeyframes(decl)) return;
      // The token definitions themselves.
      if (/^--sb-(radius|layer|duration|font-size|shadow)-/.test(decl.prop)) {
        return;
      }
      for (const [raw, token] of findRawTokens(kind, decl, lookups)) {
        report({
          ruleName,
          result,
          node: decl,
          word: raw,
          message: messages.rawValue(raw, token),
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
