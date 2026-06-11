import {
  FreeUseBibleAPI,
  DEFAULT_API_ENDPOINT,
  type Translation,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

type SortMode = "completeness" | "name";

function parseArgValue(flag: string): string | null {
  const prefix = `${flag}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function printUsage(): void {
  console.log(
    "Usage: pnpm list-bible-translations [--language=<iso-639-3>] [--endpoint=<url>] [--sort=<completeness|name>]"
  );
  console.log("");
  console.log("Examples:");
  console.log("  pnpm list-bible-translations");
  console.log("  pnpm list-bible-translations --language=eng");
  console.log("  pnpm list-bible-translations --sort=name");
  console.log(
    "  pnpm list-bible-translations --endpoint=https://bible.helloao.org/"
  );
}

function calculateCompleteness(translation: Translation): {
  completenessByBooks: number;
  completenessByChapters: number;
} {
  const totalBooks = 66; // Standard number of books in the Protestant Bible
  const totalChapters = 1189;

  const completenessByBooks = translation.numberOfBooks / totalBooks;
  const completenessByChapters =
    translation.totalNumberOfChapters / totalChapters;

  return {
    completenessByBooks,
    completenessByChapters,
  };
}

function compareTranslationsByName(a: Translation, b: Translation): number {
  const byEnglishLanguageName = (a.languageEnglishName ?? "").localeCompare(
    b.languageEnglishName ?? ""
  );
  if (byEnglishLanguageName !== 0) {
    return byEnglishLanguageName;
  }

  const byLanguageCode = a.language.localeCompare(b.language);
  if (byLanguageCode !== 0) {
    return byLanguageCode;
  }

  const byEnglishName = (a.englishName ?? "").localeCompare(
    b.englishName ?? ""
  );
  if (byEnglishName !== 0) {
    return byEnglishName;
  }

  return a.id.localeCompare(b.id);
}

function compareTranslationsByCompleteness(
  a: Translation,
  b: Translation
): number {
  if (a.numberOfBooks !== b.numberOfBooks) {
    return b.numberOfBooks - a.numberOfBooks;
  }

  if (a.totalNumberOfChapters !== b.totalNumberOfChapters) {
    return b.totalNumberOfChapters - a.totalNumberOfChapters;
  }

  if (a.totalNumberOfVerses !== b.totalNumberOfVerses) {
    return b.totalNumberOfVerses - a.totalNumberOfVerses;
  }

  return compareTranslationsByName(a, b);
}

function parseSortMode(value: string | null): SortMode {
  if (!value) {
    return "completeness";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "name") {
    return "name";
  }

  if (normalized === "completeness") {
    return "completeness";
  }

  throw new Error(
    `Invalid --sort value: ${value}. Expected one of: completeness, name.`
  );
}

function getLanguageLabel(translation: Translation): string {
  const englishName = translation.languageEnglishName?.trim();
  const localName = translation.languageName?.trim();
  const code = translation.language;

  if (englishName && localName && englishName !== localName) {
    return `${englishName} (${localName}) [${code}]`;
  }

  if (englishName) {
    return `${englishName} [${code}]`;
  }

  if (localName) {
    return `${localName} [${code}]`;
  }

  return code;
}

function groupByLanguage(
  translations: Translation[],
  sortMode: SortMode
): Map<string, Translation[]> {
  const groups = new Map<string, Translation[]>();

  for (const translation of translations) {
    const languageCode = translation.language;
    const existing = groups.get(languageCode) ?? [];
    existing.push(translation);
    groups.set(languageCode, existing);
  }

  for (const [languageCode, entries] of groups.entries()) {
    groups.set(
      languageCode,
      entries.sort(
        sortMode === "name"
          ? compareTranslationsByName
          : compareTranslationsByCompleteness
      )
    );
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const languageFilter =
    parseArgValue("--language")?.trim().toLowerCase() ?? null;
  const endpoint = parseArgValue("--endpoint")?.trim() || DEFAULT_API_ENDPOINT;
  const sortMode = parseSortMode(parseArgValue("--sort"));

  const api = new FreeUseBibleAPI(endpoint);
  const { translations } = await api.getAvailableTranslations();

  const filtered = languageFilter
    ? translations.filter(
        (translation) => translation.language.toLowerCase() === languageFilter
      )
    : translations;

  if (filtered.length === 0) {
    if (languageFilter) {
      console.log(`No translations found for language: ${languageFilter}`);
      return;
    }

    console.log("No translations found.");
    return;
  }

  const grouped = groupByLanguage(filtered, sortMode);

  console.log(`Endpoint: ${endpoint}`);
  if (languageFilter) {
    console.log(`Language filter: ${languageFilter}`);
  }
  console.log(`Sort: ${sortMode}`);
  console.log(`Total translations: ${filtered.length}`);
  console.log("");

  for (const entries of grouped.values()) {
    const languageLabel = getLanguageLabel(entries[0]!);
    console.log(`${languageLabel} (${entries.length})`);

    for (const translation of entries) {
      const direction = translation.textDirection;
      const { completenessByBooks, completenessByChapters } =
        calculateCompleteness(translation);
      const completenessPercent = (
        ((completenessByBooks + completenessByChapters) / 2) *
        100
      ).toFixed(1);
      console.log(
        `  - ${translation.id} | ${translation.englishName} | ${translation.name} | ${direction} | ${completenessPercent}%`
      );
    }

    console.log("");
  }
}

main().catch((error) => {
  console.error("Failed to list Bible translations:", error);
  process.exitCode = 1;
});
