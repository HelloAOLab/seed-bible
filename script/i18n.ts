import { program } from "commander";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type TranslationResources = Record<string, unknown>;

const I18N_DIR = path.resolve("packages", "seed-bible", "seed-bible", "i18n");
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

async function statusCommand(): Promise<void> {
  const files = await readdir(I18N_DIR, { withFileTypes: true });
  const languageCodes = files
    .filter((file) => file.isFile() && file.name.endsWith(".json"))
    .map((file) => path.basename(file.name, ".json"));

  if (!languageCodes.includes(ENGLISH_LANGUAGE)) {
    throw new Error(`Missing ${ENGLISH_LANGUAGE}.json in ${I18N_DIR}`);
  }

  const sortedLanguageCodes = [
    ENGLISH_LANGUAGE,
    ...languageCodes
      .filter((language) => language !== ENGLISH_LANGUAGE)
      .sort((a, b) => a.localeCompare(b)),
  ];

  const englishResources = await readLanguageResources(
    path.join(I18N_DIR, `${ENGLISH_LANGUAGE}.json`)
  );
  const englishTotal = englishResources.size;

  console.log(`I18n Status (${I18N_DIR})`);
  console.log(
    `English baseline keys: ${englishTotal} (${ENGLISH_LANGUAGE}.json)`
  );
  console.log("");
  console.log("Language\tKeys\tComplete");

  for (const language of sortedLanguageCodes) {
    const resources = await readLanguageResources(
      path.join(I18N_DIR, `${language}.json`)
    );

    let completedEnglishKeys = 0;
    for (const englishKey of englishResources.keys()) {
      if (isTranslatedValue(resources.get(englishKey))) {
        completedEnglishKeys += 1;
      }
    }

    const percentComplete =
      englishTotal > 0 ? (completedEnglishKeys / englishTotal) * 100 : 0;

    console.log(
      `${language}\t\t${resources.size}\t${percentComplete.toFixed(2)}% (${completedEnglishKeys}/${englishTotal})`
    );
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
