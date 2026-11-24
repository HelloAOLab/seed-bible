import stylelint from "stylelint";

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

export const ruleName = "seed-bible/theme-color-pair";

export const messages = ruleMessages(ruleName, {
  mismatched: (hardcoded, themed) =>
    `"${hardcoded}" is a fixed color but "${themed}" follows the theme, so they can clash in other themes. ` +
    `Use theme variables for both (e.g. --sb-primary-color with --sb-primary-font-color).`,
});

const FOREGROUND_PROPS = new Set([
  "color",
  "fill",
  "stroke",
  "-webkit-text-fill-color",
]);
const BACKGROUND_PROPS = new Set(["background", "background-color"]);

// CSS named colors (CSS Color Module Level 4), minus the keywords that never
// clash with a theme (`transparent`, `currentcolor`).
const NAMED_COLORS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black " +
    "blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse " +
    "chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan " +
    "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta " +
    "darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
    "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite " +
    "forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green " +
    "greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender " +
    "lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink " +
    "lightsalmon lightseagreen lightskyblue lightslategray lightslategrey " +
    "lightsteelblue lightyellow lime limegreen linen magenta maroon " +
    "mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred " +
    "midnightblue mintcream mistyrose moccasin navajowhite navy oldlace " +
    "olive olivedrab orange orangered orchid palegoldenrod palegreen " +
    "paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown " +
    "salmon sandybrown seagreen seashell sienna silver skyblue slateblue " +
    "slategray slategrey snow springgreen steelblue tan teal thistle tomato " +
    "turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" ")
);

const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const HEX_COLOR = /#[0-9a-f]{3,8}\b/i;

/**
 * "themed" when the value reads a custom property (so it can change with the
 * theme), "fixed" when it names a literal color, and null when it has no
 * color at all (`none`, `inherit`, `transparent`, a bare `url(...)`, ...).
 */
export function classifyColorValue(value) {
  // url() contents can contain anything (`url(white.png)`, `url(#mask)`).
  const stripped = value.replace(/url\([^)]*\)/gi, "");
  if (/\bvar\(\s*--/i.test(stripped)) return "themed";
  if (HEX_COLOR.test(stripped) || COLOR_FUNCTION.test(stripped)) {
    return "fixed";
  }
  const words = stripped.toLowerCase().match(/[a-z-]+/g) ?? [];
  return words.some((word) => NAMED_COLORS.has(word)) ? "fixed" : null;
}

/** @type {import("stylelint").Rule} */
const rule = (primary) => (root, result) => {
  if (!validateOptions(result, ruleName, { actual: primary })) return;

  root.walkRules((ruleNode) => {
    const foreground = [];
    const background = [];
    for (const node of ruleNode.nodes ?? []) {
      if (node.type !== "decl") continue;
      const prop = node.prop.toLowerCase();
      const kind = FOREGROUND_PROPS.has(prop)
        ? foreground
        : BACKGROUND_PROPS.has(prop)
          ? background
          : null;
      if (!kind) continue;
      const colorKind = classifyColorValue(node.value);
      if (colorKind) kind.push({ node, colorKind });
    }

    for (const [side, other] of [
      [foreground, background],
      [background, foreground],
    ]) {
      for (const fixed of side.filter((d) => d.colorKind === "fixed")) {
        const themed = other.find((d) => d.colorKind === "themed");
        if (!themed) continue;
        report({
          ruleName,
          result,
          node: fixed.node,
          message: messages.mismatched(
            `${fixed.node.prop}: ${fixed.node.value}`,
            `${themed.node.prop}: ${themed.node.value}`
          ),
        });
      }
    }
  });
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = {
  url: "https://github.com/HelloAOLab/seed-bible/blob/develop/script/stylelint/themeColorPairRule.mjs",
};

export default createPlugin(ruleName, rule);
