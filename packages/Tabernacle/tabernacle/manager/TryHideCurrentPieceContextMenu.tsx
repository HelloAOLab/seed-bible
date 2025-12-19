const currContextMenuTransformer = getBot(
  "isTabernaclePieceContextMenuTransformer",
  true
);

if (currContextMenuTransformer) destroy(currContextMenuTransformer);
