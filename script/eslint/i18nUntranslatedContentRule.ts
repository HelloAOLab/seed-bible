import { createRule } from "./i18nRuleShared";
import type { TSESTree } from "@typescript-eslint/utils";

type MessageIds = "untranslated_content";
type Options = [];

const ALPHABETIC_PATTERN = /\p{L}/gu;

const i18nUntranslatedContentRule = createRule<Options, MessageIds>({
  name: "i18n-untranslated-content",
  meta: {
    type: "problem",
    docs: {
      description:
        "Warns when JSX text nodes contain alphabetic content that is likely untranslated",
    },
    schema: [],
    messages: {
      untranslated_content:
        "Untranslated content detected in JSX text node: '{{text}}'.",
    },
  },
  defaultOptions: [],

  create(context) {
    return {
      JSXText(node: TSESTree.JSXText): void {
        const rawText = node.value;
        const normalizedText = rawText.replace(/\s+/g, " ").trim();

        if (!normalizedText) {
          return;
        }

        if (!ALPHABETIC_PATTERN.test(normalizedText)) {
          return;
        }

        const preview =
          normalizedText.length > 80
            ? `${normalizedText.slice(0, 77)}...`
            : normalizedText;

        context.report({
          node,
          messageId: "untranslated_content",
          data: {
            text: preview,
          },
        });
      },
    };
  },
});

export default i18nUntranslatedContentRule;
