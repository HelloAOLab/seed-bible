import type {
  PieceCatalogGroup,
  PieceCatalogPort,
} from "../../../application/ports/out/PieceCatalog";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { PIECE_CATALOG_MAP, TABERNACLE_PIECE_LABELS } from "./pieceCatalogMap";

export class PieceCatalogConfigProvider implements PieceCatalogPort {
  getGroups<E extends ExperienceKey>(experience: E): PieceCatalogGroup<E>[] {
    return PIECE_CATALOG_MAP[experience] ?? [];
  }

  getPieceLabel<E extends ExperienceKey>(
    _experience: E,
    key: ExperienceKeyMap[E]
  ): string {
    return TABERNACLE_PIECE_LABELS[key] ?? key;
  }
}
