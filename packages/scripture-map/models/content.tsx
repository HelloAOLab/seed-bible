export type ScriptureMapContentValue = {
  books: {
    [book: string]: {
      [chapter: string]: boolean[];
    };
  };
};
