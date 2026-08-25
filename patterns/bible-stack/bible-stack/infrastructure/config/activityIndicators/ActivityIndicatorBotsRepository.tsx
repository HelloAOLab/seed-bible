import type { ActivityIndicatorBot } from "../../models/stack";
import type {
  BotFilterFunction,
  TagFilter,
} from "../../../../../pattern-typings/AuxLibraryDefinitions";

type ByTagConstructor = <K extends keyof ActivityIndicatorBot["tags"]>(
  key: K,
  value: ActivityIndicatorBot["tags"][K]
) => BotFilterFunction;

const byTagConstructor: ByTagConstructor = (key, value) => {
  return byTag(key, value as TagFilter);
};

export class ActivityIndicatorBotsRepository {
  getIndicatorBotsByPieceDataId(
    pieceDataId: ActivityIndicatorBot["tags"]["ownerDataId"]
  ): ActivityIndicatorBot[] {
    return getBots(
      byTagConstructor("type", "ActivityIndicator"),
      byTagConstructor("ownerDataId", pieceDataId),
      byTagConstructor("isInUse", true)
    ) as ActivityIndicatorBot[];
  }
  getIndicatorBotsByPieceId(
    pieceId: ActivityIndicatorBot["tags"]["ownerBotId"]
  ): ActivityIndicatorBot[] {
    return getBots(
      byTagConstructor("type", "ActivityIndicator"),
      byTagConstructor("ownerBotId", pieceId),
      byTagConstructor("isInUse", true)
    ) as ActivityIndicatorBot[];
  }
}
