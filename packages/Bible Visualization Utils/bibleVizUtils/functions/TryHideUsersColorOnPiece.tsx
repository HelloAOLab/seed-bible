import { PieceActivityService } from "bibleVizUtils.services.PieceActivityService";
const { piece } = that;
const currUsersColor =
  PieceActivityService.getActivityIndicatorsForPiece(piece);
if (currUsersColor.length > 0)
  ObjectPooler.ReleaseObject({
    obj: currUsersColor,
    tag: currUsersColor[0].tags.poolTag,
  });
