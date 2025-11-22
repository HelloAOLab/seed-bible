if (!thisBot.vars.appId) return;

const currContextMenuTransformer = getBot(
  "isTabernaclePieceContextMenuTransformer",
  true
);

if (currContextMenuTransformer) destroy(currContextMenuTransformer);
