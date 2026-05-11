export type ScriptureMap2DContentValue = {
  books: {
    [book: string]: {
      [chapter: string]: boolean[];
    };
  };
};
