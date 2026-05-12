console.log(`[Debug] bibleVizUtils entrypoints.casualos bot created`);

import { bootstrapExtension } from "bibleVizUtils.infrastructure.di.bootstrap";
if (!configBot.tags.systemPortal) {
  bootstrapExtension();
}
