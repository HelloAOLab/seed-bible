import { program } from "commander";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type TranslationResources = Record<string, unknown>;
type ExtensionTranslationMap = Record<string, TranslationResources>;

type ExtensionDefinition = {
  packageName: string;
  extensionId: string;
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
      };

      extensions.push({
        packageName,
        extensionId: parsed.id ?? packageName,
        translations: parsed.translations ?? {},
      });
    } catch {
      continue;
    }
  }

  return extensions.sort((a, b) => a.packageName.localeCompare(b.packageName));
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

await program.parseAsync();
