import { getSubscribedUsers } from "db.annotations.library";
import { type UserIds } from "bibleVizUtils.services.UserColorStore";
import { GetRandomColor } from "bibleVizUtils.functions.colors";
import { DebouncerService } from "bibleVizUtils.services.DebouncerService";
import { userColorStore } from "bibleVizUtils.services.index";

const updateStore = async () => {
  try {
    const componentsBot = getBot(byTag("system", "app.components"));

    const [configIds, subscribedUsers] = await Promise.all([
      os.remotes(),
      getSubscribedUsers(),
    ]);

    const loggedUsersInInstanceMap = new Map<string, string>();
    const usersAuthIds = componentsBot?.tags?.usersAuthIds as
      | UserIds[]
      | undefined;
    if (usersAuthIds) {
      usersAuthIds.forEach(({ configId, authId }) => {
        if (configId && authId) loggedUsersInInstanceMap.set(configId, authId);
      });
    }

    const processedAuthIds = new Set<string>();
    const usersIdsToProcess: UserIds[] = [];

    for (const configId of configIds) {
      const authId = loggedUsersInInstanceMap.get(configId);

      if (authId) processedAuthIds.add(authId);
      usersIdsToProcess.push({ configId, authId });
    }

    if (subscribedUsers) {
      subscribedUsers.forEach(({ id }) => {
        if (!processedAuthIds.has(id)) {
          usersIdsToProcess.push({ authId: id });
        }
      });
    }

    for (const userIds of usersIdsToProcess) {
      const { configId, authId } = userIds;

      // CASE 1: Subscribed to user but not logged in in instance
      if (!configId && authId) {
        const currColor = userColorStore.getUserColor({ authId });
        if (!currColor) {
          userColorStore.addUserColor({
            color: GetRandomColor(),
            configId,
            authId,
          });
        }
        continue;
      }

      // CASE 2: User in instance
      if (configId) {
        const { color } = globalThis?.GetOrSetVisualInTags?.(configId) ?? {};

        if (!color) {
          console.error("User color not found at colorStoreController.tsx");
          continue;
        }

        const currConfigColor = userColorStore.getUserColor({ configId });
        const currAuthColor = authId
          ? userColorStore.getUserColor({ authId })
          : undefined;

        // User is logged in but saved auth color and config color doesn't match (Subscribed user logged in)
        if (authId && currAuthColor && currConfigColor !== currAuthColor) {
          userColorStore.removeUserColor({ authId });
          userColorStore.addUserColor({ color, configId, authId });
        }
        // User do not have an assigned color or it's color has changed or has just signed in
        else if (
          !currConfigColor ||
          color !== currConfigColor ||
          (authId && !currAuthColor)
        ) {
          userColorStore.addUserColor({ color, configId, authId });
        }
      }
    }
  } catch (error) {
    console.error("Error updating UserColorStore:", error);
  }
};

const updateUserColorStoreDebouncer = new DebouncerService(updateStore, 500);

const executer = updateUserColorStoreDebouncer.execute;

export { executer as updateUserColorStore };
