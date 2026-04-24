import type { BookInfo } from "bibleVizUtils.infrastructure.models.arrangement";

export class StackService {
  constructor() {}

  getSectionLevels = (books: BookInfo[]) => {
    const levels: BookInfo[][] = [];
    const groupsIncluded: number[] = [];
    for (const book of books) {
      if (book.group) {
        if (groupsIncluded.includes(book.group)) continue;

        const group: BookInfo[] = books.filter((currBook) => {
          return currBook.group === book.group;
        });
        levels.push(group);
        groupsIncluded.push(book.group);
      } else {
        levels.push([book]);
      }
    }
    return levels;
  };
}
