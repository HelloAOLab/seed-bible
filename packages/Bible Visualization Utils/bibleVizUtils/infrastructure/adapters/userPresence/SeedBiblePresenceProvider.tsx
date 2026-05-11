import type { Tab } from "bibleVizUtils.domain.models.seedBible";
import type { UserPresence } from "bibleVizUtils.domain.models.userPresence";
import type { UserPresenceProviderPort } from "bibleVizUtils.domain.ports.userPresence";

export class SeedBiblePresenceProvider implements UserPresenceProviderPort {
  getCurrUserId(): string {
    return configBot.id;
  }

  getActiveTabData(): Tab["data"] | undefined {
    return (globalThis as any).CurrentActiveTabData;
  }

  getActiveTabId(): Tab["id"] | undefined {
    return (globalThis as any).ActiveTab;
  }

  getActiveTab(): Tab | undefined {
    const data = this.getActiveTabData();
    const id = this.getActiveTabId();

    if (!data || !id) {
      return undefined;
    }

    const tab: Tab = {
      id,
      data,
      taken: false, // TODO: Correctly find this
    };
    return tab;
  }

  getRemotesPresence(): UserPresence {
    return new Map(); // TODO: Get real remotes presence
  }
}
