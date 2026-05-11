import { sessionController } from "bibleVizUtils.infrastructure.di.bootstrap";

const { bots } = that;

sessionController?.handleAnyBotsAdded(bots);
