import { getSubscribedUsers } from "db.annotations.library";
import {
  userColorStore,
  type UserIds,
} from "bibleVizUtils.services.UserColorStore";
import { type HexString } from "bibleVizUtils.functions.colors";

type GetUserPresenceBorderGradientColorsType = (params: {
  colors: HexString[];
  diffuse?: number;
}) => React.CSSProperties["backgroundImage"];

export const UpdateUserColorStore = async () => {
  try {
    const componentsBot = getBot(byTag("system", "app.components"));

    const [configIds, subscribedUsers] = await Promise.all([
      os.remotes(),
      getSubscribedUsers(),
    ]);

    const authMap = new Map<string, string>();
    if (componentsBot?.tags?.usersAuthIds) {
      (componentsBot.tags.usersAuthIds as UserIds[]).forEach(
        ({ configId, authId }) => {
          if (configId && authId) authMap.set(configId, authId);
        }
      );
    }

    const processedAuthIds = new Set<string>();
    const usersIdsToProcess: UserIds[] = [];

    for (const configId of configIds) {
      const authId = authMap.get(configId);

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

      if (configId) {
        const { color } = globalThis?.GetOrSetVisualInTags?.(configId) ?? {};

        if (!color) {
          console.error("User color not found at users.tsx");
          continue;
        }

        const currConfigColor = userColorStore.getUserColor({ configId });
        if (authId) {
          const currAuthColor = userColorStore.getUserColor({ authId });
          if (currAuthColor) {
            if (!currConfigColor || currConfigColor !== currAuthColor) {
              if (currConfigColor && currConfigColor !== currAuthColor) {
                userColorStore.removeUserColor({ authId });
              }
              userColorStore.addUserColor({ color, configId, authId });
            }
          } else {
            userColorStore.addUserColor({ color, configId, authId });
          }
        } else {
          if (color !== currConfigColor) {
            userColorStore.addUserColor({ color, configId, authId });
          }
        }
      } else if (authId) {
        const currColor = userColorStore.getUserColor({ authId });

        if (!currColor) {
          const randomColor = BibleVizUtils.Functions.GetRandomColor();
          userColorStore.addUserColor({ color: randomColor, configId, authId });
        }
      }
    }
  } catch (error) {
    console.error("Error updating UserColorStore:", error);
  }
};

export const GetUserPresenceBorderGradientColors: GetUserPresenceBorderGradientColorsType =
  ({ colors, diffuse = 0 }) => {
    const fixedColors = [...colors, colors[0]];
    const step = 360 / colors.length;
    const offset = 45;
    const gradientColors = fixedColors
      .map((color, index) => {
        return `${color} ${Math.max(0, Math.min(360, step * index - offset + (index === 0 ? 0 : diffuse)))}deg ${Math.max(0, Math.min(360, step * (index + 1) - diffuse - offset))}deg`;
      })
      .join(", ");
    return gradientColors;
  };
