import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

export class PieceActivityIndicatorsRepository {
  static getIndicatorsByPieceId(pieceDataId: string): Bot[] {
    return getBots(
      byTag("isUserColor", true),
      byTag("ownerDataId", pieceDataId),
      byTag("isInUse", true)
    );
  }
}
