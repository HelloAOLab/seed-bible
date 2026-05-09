import type { HexString } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/commonTypes";
import type { UserIds } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/userPresence";
import type { SessionProviderPort } from "bibleVizUtils.domain.ports.session";

export class SessionProvider implements SessionProviderPort {
  async getConnectedUsersConfigId() {
    const ids = await os.remotes();
    return ids;
  }
  getConnectedUsersAuthMapList() {
    const componentsBot = getBot(byTag("system", "app.components"));
    const usersAuthIds = componentsBot?.tags?.usersAuthIds as
      | UserIds[]
      | undefined;
    return usersAuthIds;
  }
  getUserColorByConfigId(id: string) {
    const { color } =
      (globalThis?.GetOrSetVisualInTags?.(id) as
        | { color: HexString }
        | undefined) ?? {};
    return color;
  }
}
