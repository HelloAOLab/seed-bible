import { bootstrapApp } from "bibleVizUtils.infrastructure.di.bootstrap";

if (!configBot.tags.systemPortal) {
  bootstrapApp();
}
