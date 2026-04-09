/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRule } from "./i18nRuleShared";
import { difference } from "es-toolkit";

type MessageIds = "incomplete_translation" | "config_error";
type Options = [];

type TranslationObject = Record<string, unknown>;

function isObject(value: unknown): value is TranslationObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenTranslationKeys(
  value: unknown,
  prefix = "",
  output = new Set<string>()
): Set<string> {
  if (typeof value === "string") {
    if (prefix) {
      output.add(prefix);
    }
    return output;
  }

  if (!isObject(value)) {
    if (prefix) {
      output.add(prefix);
    }
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    flattenTranslationKeys(child, childPrefix, output);
  }

  return output;
}

const getMemberKey = (member: any): string | null => {
  return member.name.type === "String" ? member.name.value : member.name.name;
};

const i18nExtensionIncompleteTranslationsRule = createRule<Options, MessageIds>(
  {
    name: "translation-extension-incomplete-translations",
    meta: {
      type: "problem",
      docs: {
        description:
          "Checks extension.json locale translations for missing keys",
      },
      schema: [],
      messages: {
        incomplete_translation: "Locale '{{locale}}' is missing key '{{key}}'",
        config_error: "i18n lint rule configuration error: {{message}}",
      },
    },
    defaultOptions: [],

    create(context) {
      return {
        Member(node: any): void {
          const key = getMemberKey(node);

          if (key === "translations" && node.value.type === "Object") {
            const english = node.value.members.find(
              (p: any) => getMemberKey(p) === "en"
            );
            const englishKeys = new Set<string>();
            if (english && english.value) {
              const englishValue = JSON.parse(
                context.sourceCode.getText(english.value)
              );
              for (const key of flattenTranslationKeys(englishValue)) {
                englishKeys.add(key);
              }
            } else {
              context.report({
                node,
                messageId: "config_error",
                data: {
                  message: "Missing 'en' translations in extension manifest.",
                },
              });
            }

            const nonEnglishTranslations = node.value.members.filter(
              (p: any) => getMemberKey(p) !== "en"
            );
            for (const translationProp of nonEnglishTranslations) {
              const locale = getMemberKey(translationProp);
              const translationValue = JSON.parse(
                context.sourceCode.getText(translationProp.value)
              );
              const translationKeys = flattenTranslationKeys(translationValue);

              const missingKeys = difference(
                [...englishKeys],
                [...translationKeys]
              );
              for (const key of missingKeys) {
                context.report({
                  node: translationProp,
                  messageId: "incomplete_translation",
                  data: { locale, key },
                });
              }
            }
          }
        },
      };
    },
  }
);

export default i18nExtensionIncompleteTranslationsRule;
