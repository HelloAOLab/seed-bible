import { program } from "commander";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { translateResources } from "./lib/translation";

type TranslationResources = Record<string, unknown>;
type ExtensionTranslationMap = Record<string, TranslationResources>;

type ExtensionDefinition = {
  packageName: string;
  extensionId: string;
  filePath: string;
  raw: Record<string, unknown>;
  translations: ExtensionTranslationMap;
};

const I18N_DIR = path.resolve("packages", "seed-bible", "seed-bible", "i18n");
const PACKAGES_DIR = path.resolve("packages");
const ENGLISH_LANGUAGE = "en";

function flattenTranslationKeys(
  resources: TranslationResources,
  prefix = ""
): Map<string, string> {
  const keys = new Map<string, string>();

  for (const [key, value] of Object.entries(resources)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      keys.set(fullKey, value);
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nestedKeys = flattenTranslationKeys(
        value as TranslationResources,
        fullKey
      );
      for (const [nestedKey, nestedValue] of nestedKeys) {
        keys.set(nestedKey, nestedValue);
      }
    }
  }

  return keys;
}

async function readLanguageResources(
  filePath: string
): Promise<Map<string, string>> {
  const fileContents = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(fileContents) as TranslationResources;
  return flattenTranslationKeys(parsed);
}

function isTranslatedValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function sortLanguages(languageCodes: string[]): string[] {
  const unique = [...new Set(languageCodes)];
  return [
    ENGLISH_LANGUAGE,
    ...unique
      .filter((language) => language !== ENGLISH_LANGUAGE)
      .sort((a, b) => a.localeCompare(b)),
  ];
}

function printLanguageStatusTable(
  englishResources: Map<string, string>,
  resourcesByLanguage: Map<string, Map<string, string>>
): void {
  const englishTotal = englishResources.size;

  console.log("Lang\tKeys\tComplete");

  for (const language of sortLanguages([...resourcesByLanguage.keys()])) {
    const resources =
      resourcesByLanguage.get(language) ?? new Map<string, string>();

    let completedEnglishKeys = 0;
    for (const englishKey of englishResources.keys()) {
      if (isTranslatedValue(resources.get(englishKey))) {
        completedEnglishKeys += 1;
      }
    }

    const percentComplete =
      englishTotal > 0 ? (completedEnglishKeys / englishTotal) * 100 : 0;

    console.log(
      `${language}\t${resources.size}\t${percentComplete.toFixed(2)}% (${completedEnglishKeys}/${englishTotal})`
    );
  }
}

async function readMainAppResourcesByLanguage(): Promise<
  Map<string, Map<string, string>>
> {
  const files = await readdir(I18N_DIR, { withFileTypes: true });
  const languageCodes = files
    .filter((file) => file.isFile() && file.name.endsWith(".json"))
    .map((file) => path.basename(file.name, ".json"));

  if (!languageCodes.includes(ENGLISH_LANGUAGE)) {
    throw new Error(`Missing ${ENGLISH_LANGUAGE}.json in ${I18N_DIR}`);
  }

  const resourcesByLanguage = new Map<string, Map<string, string>>();
  for (const language of languageCodes) {
    const resources = await readLanguageResources(
      path.join(I18N_DIR, `${language}.json`)
    );
    resourcesByLanguage.set(language, resources);
  }

  return resourcesByLanguage;
}

async function readExtensionDefinitions(): Promise<ExtensionDefinition[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const extensions: ExtensionDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageName = entry.name;
    const extensionPath = path.join(
      PACKAGES_DIR,
      packageName,
      "extension.json"
    );

    try {
      const extensionContents = await readFile(extensionPath, "utf-8");
      const parsed = JSON.parse(extensionContents) as {
        id?: string;
        translations?: ExtensionTranslationMap;
        [key: string]: unknown;
      };

      extensions.push({
        packageName,
        extensionId: parsed.id ?? packageName,
        filePath: extensionPath,
        raw: parsed,
        translations: parsed.translations ?? {},
      });
    } catch {
      continue;
    }
  }

  return extensions.sort((a, b) => a.packageName.localeCompare(b.packageName));
}

function getMissingEnglishResources(
  englishResources: Map<string, string>,
  languageResources: Map<string, string>
): Record<string, string> {
  const missing: Record<string, string> = {};

  for (const [key, value] of englishResources) {
    if (!isTranslatedValue(languageResources.get(key))) {
      missing[key] = value;
    }
  }

  return missing;
}

function applyFlatResources(
  resources: TranslationResources,
  values: Record<string, string>
): void {
  for (const [key, value] of Object.entries(values)) {
    resources[key] = value;
  }
}

function getTranslationClientConfig(options: { projectId?: string }): {
  projectId: string;
} {
  const projectId =
    options.projectId ??
    process.env.GOOGLE_CLOUD_PROJECT_ID ??
    process.env.GCLOUD_PROJECT;

  if (!projectId) {
    throw new Error(
      "Missing Google Cloud project ID. Provide --project-id or set GOOGLE_CLOUD_PROJECT_ID."
    );
  }

  return {
    projectId,
  };
}

async function translateCoreKeys(
  options: { projectId: string },
  mode: "missing" | "all"
): Promise<void> {
  const files = await readdir(I18N_DIR, { withFileTypes: true });
  const languageCodes = files
    .filter((file) => file.isFile() && file.name.endsWith(".json"))
    .map((file) => path.basename(file.name, ".json"));

  if (!languageCodes.includes(ENGLISH_LANGUAGE)) {
    throw new Error(`Missing ${ENGLISH_LANGUAGE}.json in ${I18N_DIR}`);
  }

  const englishFilePath = path.join(I18N_DIR, `${ENGLISH_LANGUAGE}.json`);
  const englishRaw = JSON.parse(
    await readFile(englishFilePath, "utf-8")
  ) as TranslationResources;
  const englishResources = flattenTranslationKeys(englishRaw);
  const allEnglishResources = Object.fromEntries(englishResources) as Record<
    string,
    string
  >;

  const label =
    mode === "missing"
      ? "Translating missing core app keys..."
      : "Translating all core app keys...";
  console.log(label);

  for (const language of languageCodes.sort((a, b) => a.localeCompare(b))) {
    if (language === ENGLISH_LANGUAGE) {
      continue;
    }

    const languageFilePath = path.join(I18N_DIR, `${language}.json`);
    const languageRaw = JSON.parse(
      await readFile(languageFilePath, "utf-8")
    ) as TranslationResources;

    const resourcesToTranslate =
      mode === "missing"
        ? getMissingEnglishResources(
            englishResources,
            flattenTranslationKeys(languageRaw)
          )
        : allEnglishResources;

    const count = Object.keys(resourcesToTranslate).length;

    if (count === 0) {
      console.log(`  ${language}: no missing keys`);
      continue;
    }

    const translated = await translateResources(
      options.projectId,
      { language: ENGLISH_LANGUAGE, resources: resourcesToTranslate },
      language
    );

    applyFlatResources(languageRaw, translated.resources);
    await writeFile(
      languageFilePath,
      `${JSON.stringify(languageRaw, null, 2)}\n`,
      "utf-8"
    );

    const verb = mode === "missing" ? "missing" : "";
    console.log(
      `  ${language}: translated ${count} ${verb} key(s)`.replace("  ", "  ")
    );
  }
}

async function translateMissingCoreKeys(options: {
  projectId: string;
}): Promise<void> {
  await translateCoreKeys(options, "missing");
}

async function translateExtensionKeys(
  options: { projectId: string },
  mode: "missing" | "all"
): Promise<void> {
  const coreResourcesByLanguage = await readMainAppResourcesByLanguage();
  const coreLanguages = [...coreResourcesByLanguage.keys()]
    .filter((language) => language !== ENGLISH_LANGUAGE)
    .sort((a, b) => a.localeCompare(b));

  const extensions = await readExtensionDefinitions();

  if (extensions.length === 0) {
    console.log("No extension.json files were found in packages.");
    return;
  }

  const label =
    mode === "missing"
      ? "Translating missing extension keys..."
      : "Translating all extension keys...";
  console.log(label);

  for (const extension of extensions) {
    const englishRawResources = extension.translations[ENGLISH_LANGUAGE];

    if (!englishRawResources) {
      console.log(
        `  ${extension.packageName}: skipped (missing ${ENGLISH_LANGUAGE} translations)`
      );
      continue;
    }

    const englishResources = flattenTranslationKeys(englishRawResources);
    const allEnglishResources = Object.fromEntries(englishResources) as Record<
      string,
      string
    >;
    const translations =
      (extension.raw.translations as ExtensionTranslationMap | undefined) ?? {};
    let extensionUpdated = false;

    console.log(`  ${extension.packageName}:`);

    const existingLanguages = Object.keys(translations).filter(
      (language) => language !== ENGLISH_LANGUAGE
    );
    const supportedLanguages = [
      ...new Set([...existingLanguages, ...coreLanguages]),
    ].sort((a, b) => a.localeCompare(b));

    if (supportedLanguages.length === 0) {
      console.log("    no non-English languages to update");
      continue;
    }

    for (const language of supportedLanguages) {
      const languageRawResources =
        (translations[language] as TranslationResources | undefined) ?? {};
      const wasMissingLanguage = !(language in translations);

      const resourcesToTranslate =
        mode === "missing"
          ? getMissingEnglishResources(
              englishResources,
              flattenTranslationKeys(languageRawResources)
            )
          : allEnglishResources;

      const count = Object.keys(resourcesToTranslate).length;

      if (count === 0) {
        console.log(`    ${language}: no missing keys`);
        continue;
      }

      const translated = await translateResources(
        options.projectId,
        { language: ENGLISH_LANGUAGE, resources: resourcesToTranslate },
        language
      );

      applyFlatResources(languageRawResources, translated.resources);
      translations[language] = languageRawResources;
      extensionUpdated = true;
      if (wasMissingLanguage) {
        console.log(
          `    ${language}: added language and translated ${count} key(s)`
        );
      } else {
        console.log(`    ${language}: translated ${count} key(s)`);
      }
    }

    if (extensionUpdated) {
      extension.raw.translations = translations;
      await writeFile(
        extension.filePath,
        `${JSON.stringify(extension.raw, null, 2)}\n`,
        "utf-8"
      );
    }
  }
}

async function translateMissingExtensionKeys(options: {
  projectId: string;
}): Promise<void> {
  await translateExtensionKeys(options, "missing");
}

async function translateMissingKeysCommand(options: {
  projectId?: string;
}): Promise<void> {
  const translationConfig = getTranslationClientConfig(options);
  await translateMissingCoreKeys(translationConfig);
  await translateMissingExtensionKeys(translationConfig);
}

async function translateAllCommand(options: {
  projectId?: string;
}): Promise<void> {
  const translationConfig = getTranslationClientConfig(options);
  await translateCoreKeys(translationConfig, "all");
  await translateExtensionKeys(translationConfig, "all");
}

function getExtensionResourcesByLanguage(
  extension: ExtensionDefinition
): Map<string, Map<string, string>> {
  const resourcesByLanguage = new Map<string, Map<string, string>>();

  for (const [language, resources] of Object.entries(extension.translations)) {
    resourcesByLanguage.set(language, flattenTranslationKeys(resources));
  }

  return resourcesByLanguage;
}

function printExtensionStatus(extension: ExtensionDefinition): void {
  const resourcesByLanguage = getExtensionResourcesByLanguage(extension);

  if (!resourcesByLanguage.has(ENGLISH_LANGUAGE)) {
    console.log(
      `${extension.packageName} (${extension.extensionId}): missing ${ENGLISH_LANGUAGE} translations`
    );
    return;
  }

  const englishResources = resourcesByLanguage.get(ENGLISH_LANGUAGE)!;
  const supportedLanguages = sortLanguages([...resourcesByLanguage.keys()]);

  console.log(`${extension.packageName} (${extension.extensionId})`);
  console.log(`English baseline keys: ${englishResources.size}`);
  console.log(`Supported languages: ${supportedLanguages.join(", ")}`);
  printLanguageStatusTable(englishResources, resourcesByLanguage);
}

async function statusCommand(): Promise<void> {
  const mainAppResourcesByLanguage = await readMainAppResourcesByLanguage();
  const englishResources = mainAppResourcesByLanguage.get(ENGLISH_LANGUAGE)!;

  console.log(`I18n Status (${I18N_DIR})`);
  console.log(
    `English baseline keys: ${englishResources.size} (${ENGLISH_LANGUAGE}.json)`
  );
  console.log("");
  printLanguageStatusTable(englishResources, mainAppResourcesByLanguage);

  const extensions = await readExtensionDefinitions();
  console.log("");
  console.log("Extension Translation Status");

  if (extensions.length === 0) {
    console.log("No extension.json files were found in packages.");
    return;
  }

  for (const extension of extensions) {
    console.log("");
    printExtensionStatus(extension);
  }
}

program.name("i18n").description("Commands for working with i18n resources.");

program
  .command("status")
  .description(
    "Lists language files, key counts, and completion percentage compared to English."
  )
  .action(async () => {
    await statusCommand();
  });

program
  .command("translate-missing-keys")
  .description(
    "Translates keys missing from a language but present in English for core app and extensions."
  )
  .option(
    "--project-id <projectId>",
    "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID env var."
  )
  .action(async (options) => {
    await translateMissingKeysCommand(options);
  });

program
  .command("translate-all")
  .description(
    "Translates all keys for every non-English language in the core app and extensions, overwriting any existing translations."
  )
  .option(
    "--project-id <projectId>",
    "Google Cloud project ID. Defaults to GOOGLE_CLOUD_PROJECT_ID env var."
  )
  .action(async (options) => {
    await translateAllCommand(options);
  });

await program.parseAsync();
