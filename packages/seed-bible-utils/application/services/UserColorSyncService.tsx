import { GetRandomColor } from "../../domain/functions/colors";
import type { UserColorSyncPort } from "@packages/seed-bible-utils/application/ports/in/userColorSync";
import type { UserIds } from "../../domain/models/userPresence";
import type {
  UserColorStorePort,
  SessionProviderPort,
  UserDatabasePort,
} from "../../domain/ports/session";

interface ServiceParams {
  sessionProviderPort: SessionProviderPort;
  userDatabasePort: UserDatabasePort;
  userColorStorePort: UserColorStorePort;
}

export class UserColorSyncService implements UserColorSyncPort {
  #sessionProviderPort: ServiceParams["sessionProviderPort"];
  #userDatabasePort: ServiceParams["userDatabasePort"];
  #userColorStorePort: ServiceParams["userColorStorePort"];

  constructor({
    sessionProviderPort,
    userDatabasePort,
    userColorStorePort,
  }: ServiceParams) {
    this.#sessionProviderPort = sessionProviderPort;
    this.#userDatabasePort = userDatabasePort;
    this.#userColorStorePort = userColorStorePort;
  }

  async syncUserColors() {
    try {
      const [configIds, subscribedUsers] = await Promise.all([
        this.#sessionProviderPort.getConnectedUsersConfigId(),
        this.#userDatabasePort.getSubscribedUsers(),
      ]);
      const usersAuthIds = this.#sessionProviderPort.getConnectedUsers();

      const loggedUsersInInstanceMap = new Map<string, string>();
      if (usersAuthIds) {
        usersAuthIds.forEach(({ configId, authId }) => {
          if (configId && authId)
            loggedUsersInInstanceMap.set(configId, authId);
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
          const currColor = this.#userColorStorePort.getUserColor({ authId });
          if (!currColor) {
            this.#userColorStorePort.addUserColor({
              color: GetRandomColor(),
              configId,
              authId,
            });
          }
          continue;
        }

        // CASE 2: User in instance
        if (configId) {
          const color = this.#sessionProviderPort.getUserColorById(
            authId ?? configId ?? "anonymous"
          );

          if (!color) {
            throw new Error(
              "UserColorSyncService: User color not found at syncUserColors"
            );
          }

          const currConfigColor = this.#userColorStorePort.getUserColor({
            configId,
          });
          const currAuthColor = authId
            ? this.#userColorStorePort.getUserColor({ authId })
            : undefined;

          // User is logged in but saved auth color and config color doesn't match (Subscribed user logged in)
          if (authId && currAuthColor && currConfigColor !== currAuthColor) {
            this.#userColorStorePort.removeUserColor({ authId });
            this.#userColorStorePort.addUserColor({ color, configId, authId });
          }
          // User do not have an assigned color or it's color has changed or has just logged in
          else if (
            !currConfigColor ||
            color !== currConfigColor ||
            (authId && !currAuthColor)
          ) {
            this.#userColorStorePort.addUserColor({ color, configId, authId });
          }
        }
      }
    } catch (error) {
      throw new Error(`Error updating color store at UserColorSyncService`, {
        cause: error,
      });
    }
  }
}
