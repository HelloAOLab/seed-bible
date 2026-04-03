import {
  analyzeProject,
  createRule,
  getContextCwd,
  getContextFilename,
  getLocaleFromFilePath,
} from "./i18nRuleShared";

type MessageIds = "unused_key" | "config_error";
type Options = [];

let reportedConfigError = false;

const i18nUnusedKeysRule = createRule<Options, MessageIds>({
  name: "translation-unused-keys",
  meta: {
    type: "problem",
    docs: {
      description:
        "Checks for translation keys that are not used in TypeScript code",
    },
    schema: [],
    messages: {
      unused_key: "Unused translation key: '{{key}}'.",
      config_error: "i18n lint rule configuration error: {{message}}",
    },
  },
  defaultOptions: [],

  create(context) {
    const projectRoot = getContextCwd(context);
    const analysis = analyzeProject(projectRoot);

    return {
      Object(node: any): void {
        if (analysis.error) {
          if (reportedConfigError) {
            return;
          }

          reportedConfigError = true;
          context.report({
            node,
            messageId: "config_error",
            data: { message: analysis.error },
          });
          return;
        }
      },

      Member(node: any): void {
        const key =
          node.name.type === "String" ? node.name.value : node.name.name;
        if (!analysis.usedKeys.has(key)) {
          context.report({
            node,
            messageId: "unused_key",
            data: { key },
          });
        }
      },
    };
  },
});

export default i18nUnusedKeysRule;
