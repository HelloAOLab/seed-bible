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
        "Checks en.json for translation keys that are not used in TypeScript code",
    },
    schema: [],
    messages: {
      unused_key: "Unused translation key in en.json: '{{key}}'.",
      config_error: "i18n lint rule configuration error: {{message}}",
    },
  },
  defaultOptions: [],

  create(context) {
    const projectRoot = getContextCwd(context);
    const analysis = analyzeProject(projectRoot);

    return {
      Program(node): void {
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

        const locale = getLocaleFromFilePath(getContextFilename(context));
        if (locale !== "en") {
          return;
        }

        for (const key of analysis.englishKeys) {
          if (!analysis.usedKeys.has(key)) {
            context.report({
              node,
              messageId: "unused_key",
              data: { key },
            });
          }
        }
      },
    };
  },
});

export default i18nUnusedKeysRule;
