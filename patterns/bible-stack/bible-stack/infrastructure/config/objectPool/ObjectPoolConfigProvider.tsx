import type { BiblePiece } from "../../../domain/models/canvas";
import { LISTEN_TAGS } from "./listenTags";

export class ObjectPoolerConfigProvider {
  getListenTags<K extends BiblePiece>(type: K): (typeof LISTEN_TAGS)[K] {
    return LISTEN_TAGS[type];
  }
}
