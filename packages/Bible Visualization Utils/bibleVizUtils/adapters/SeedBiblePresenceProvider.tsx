import type { Tab } from "bibleVizUtils.models.seedBible.models";
import type {
  UserPresence,
  UserPresenceProvider,
} from "bibleVizUtils.models.userPresence.models";

export class SeedBiblePresenceProvider implements UserPresenceProvider {
  getCurrUserId(): string {
    return configBot.id;
  }

  getActiveTab(): Tab | undefined {
    return (globalThis as unknown as { ActiveTab: Tab | undefined }).ActiveTab;
  }

  getRemotesPresence(): UserPresence {
    return new Map(); // TODO: Get real remotes presence
  }
}
