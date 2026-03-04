const G = globalThis;
thisBot.fetchAnnotationsData({ ...G.CurrentBookData });
thisBot.fetchAnnotationsData({ ...G.CurrentBookData, prev: true });
thisBot.fetchAnnotationsData({ ...G.CurrentBookData, next: true });
