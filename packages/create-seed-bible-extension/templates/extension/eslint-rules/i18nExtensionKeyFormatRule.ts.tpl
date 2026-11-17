// Vendored from the seed-bible monorepo's
// script/eslint/i18nExtensionKeyFormatRule.ts (only the `createRule`
// import path changed) — flags extension.json translation keys that
// i18next can't look up.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRule } from "./createRule";

type MessageIds = "colon_in_key";
type Options = [];

const getMemberKey = (member: any): string | null =>
  member.name.type === "String" ? member.name.value : member.name.name;

const isObject = (node: any) => node?.type === "Object";

/**
 * i18next reads `a:b` as the key `b` in a set of strings named `a`, so a key
 * with a colon in it is never found and the user sees its default text, or the
 * key itself, in every language.
 */
const i18nExtensionKeyFormatRule = createRule<Options, MessageIds>({
  name: "translation-extension-key-format",
  meta: {
    type: "problem",
    docs: {
      description:
        "Checks extension.json translation keys for characters i18next can't look up",
    },
    schema: [],
    messages: {
      colon_in_key:
        "Translation key '{{key}}' contains ':', which i18next reads as a namespace, so this string is never found. Use '-' or '.' instead.",
    },
  },
  defaultOptions: [],

  create(context) {
    return {
      Member(node: any): void {
        if (getMemberKey(node) !== "translations" || !isObject(node.value)) {
          return;
        }
        for (const locale of node.value.members) {
          if (!isObject(locale.value)) {
            continue;
          }
          for (const entry of locale.value.members) {
            const key = getMemberKey(entry);
            if (key?.includes(":")) {
              context.report({
                node: entry.name,
                messageId: "colon_in_key",
                data: { key },
              });
            }
          }
        }
      },
    };
  },
});

export default i18nExtensionKeyFormatRule;
