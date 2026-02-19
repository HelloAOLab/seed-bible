export interface ReferenceInterface {
  book: string;
  chapter: number;
  verse: number;
  votes: number;
  endVerse?: number;
}

export interface ReferencesInterface {
  references: ReferenceInterface[];
  book: string;
  chapter: number;
  verse: number;
}

export interface BookReference {
  id: string;
  order: number;
  numberOfChapters: number;
  numberOfVerses: number;
  numberOfReferences: number;
  firstChapterApiLink: string;
  lastChapterApiLink: string;
}
