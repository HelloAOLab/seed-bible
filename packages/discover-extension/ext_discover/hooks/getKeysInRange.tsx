import { areKeysEqual } from "ext_discover.hooks.areKeysEqual";
import type { ChapterKey } from "ext_discover.hooks.areKeysEqual";

export interface GetKeysInRangeProps {
  selection: Record<string, any>;
  keyA: ChapterKey;
  keyB: ChapterKey;
}

export function getKeysInRange(props: GetKeysInRangeProps): ChapterKey[] {
  const { selection, keyA, keyB } = props;
  const allKeys: ChapterKey[] = [];

  for (const testamentName of Object.keys(selection).toReversed()) {
    const testament = selection[testamentName];
    for (const sectionName of Object.keys(testament).toReversed()) {
      const section = testament[sectionName];
      for (const bookName of Object.keys(section).toReversed()) {
        const chapters = section[bookName];
        for (
          let chapterIndex = 0;
          chapterIndex < chapters.length;
          chapterIndex++
        ) {
          allKeys.push({ testamentName, sectionName, bookName, chapterIndex });
        }
      }
    }
  }

  const indexA = allKeys.findIndex((currentKey) =>
    areKeysEqual(currentKey, keyA)
  );
  const indexB = allKeys.findIndex((currentKey) =>
    areKeysEqual(currentKey, keyB)
  );

  const start = Math.min(indexA, indexB);
  const end = Math.max(indexA, indexB);

  return allKeys.slice(start, end + 1);
}
