import { createRule, analyzeProject, getContextCwd } from "./i18nRuleShared";

type MessageIds = "missing_key" | "config_error";
type Options = [];

let reportedConfigError = false;

const i18nMissingKeysRule = createRule<Options, MessageIds>({
  name: "translation-missing-keys",
  meta: {
    type: "problem",
    docs: {
      description: "Checks for missing translation keys in en.json",
    },
    schema: [],
    messages: {
      missing_key: "Missing translation key in en.json: '{{key}}'.",
      config_error: "i18n lint rule configuration error: {{message}}",
    },
  },
  defaultOptions: [],

  create(context) {
    const projectRoot = getContextCwd(context);
    const analysis = analyzeProject(projectRoot);

    return {
      Program(node): void {
        if (reportedConfigError || !analysis.error) {
          return;
        }

        reportedConfigError = true;
        context.report({
          node,
          messageId: "config_error",
          data: { message: analysis.error },
        });
      },

      CallExpression(node): void {
        if (analysis.error) {
          return;
        }

        if (node.callee.type !== "Identifier" || node.callee.name !== "t") {
          return;
        }

        const firstArgument = node.arguments[0];
        if (!firstArgument) {
          return;
        }

        if (
          firstArgument.type === "Literal" &&
          typeof firstArgument.value === "string"
        ) {
          const key = firstArgument.value;
          if (!analysis.englishKeys.has(key)) {
            context.report({
              node: firstArgument,
              messageId: "missing_key",
              data: { key },
            });
          }
        }
      },
    };
  },
});

export default i18nMissingKeysRule;
