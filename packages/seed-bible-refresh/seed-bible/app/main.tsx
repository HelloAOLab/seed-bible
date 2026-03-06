import { BibleReader } from "seed-bible.components.BibleReader";
import { BibleReadingManager } from "seed-bible.managers.BibleReadingManager";

export function Main() {
  const readingState = BibleReadingManager();
  return <BibleReader {...readingState} />;
}
