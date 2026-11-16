import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../domain/models/experience";
import {
  TABERNACLE_PIECE_KEYS,
  type TabernaclePieceKey,
} from "../../../domain/models/piece";
import type { PieceCatalogGroup } from "../../../application/ports/out/PieceCatalog";

export type PieceCatalogMap = {
  [E in ExperienceKey]: PieceCatalogGroup<E>[];
};

export const PIECE_CATALOG_MAP: PieceCatalogMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: [
    {
      id: "most-holy-place",
      label: "Most Holy Place",
      startsFolded: false,
      keys: [TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT],
    },
    {
      id: "holy-place",
      label: "Holy Place",
      startsFolded: false,
      keys: [
        TABERNACLE_PIECE_KEYS.INCENSE_ALTAR,
        TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD,
        TABERNACLE_PIECE_KEYS.MENORAH,
      ],
    },
    {
      id: "outer-court",
      label: "Outer Court",
      startsFolded: false,
      keys: [
        TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE,
        TABERNACLE_PIECE_KEYS.BRONZE_LAVER,
        TABERNACLE_PIECE_KEYS.FENCE,
      ],
    },
    {
      id: "structure",
      label: "Structure & coverings",
      startsFolded: true,
      keys: [
        TABERNACLE_PIECE_KEYS.INNER_CURTAIN,
        TABERNACLE_PIECE_KEYS.FRONT_CURTAIN,
        TABERNACLE_PIECE_KEYS.INNER_PILLARS,
        TABERNACLE_PIECE_KEYS.FRONT_PILLARS,
        TABERNACLE_PIECE_KEYS.WALLS,
        TABERNACLE_PIECE_KEYS.BARS,
        TABERNACLE_PIECE_KEYS.RINGS,
        TABERNACLE_PIECE_KEYS.PURPLE_CURTAIN,
        TABERNACLE_PIECE_KEYS.BROWN_CURTAIN,
        TABERNACLE_PIECE_KEYS.RED_CURTAIN,
        TABERNACLE_PIECE_KEYS.GREY_CURTAIN,
        TABERNACLE_PIECE_KEYS.GROUND,
      ],
    },
  ],
};

export const TABERNACLE_PIECE_LABELS: Record<TabernaclePieceKey, string> = {
  [TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE]: "Altar of Sacrifice",
  [TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]: "Ark of the Covenant",
  [TABERNACLE_PIECE_KEYS.BARS]: "Bars",
  [TABERNACLE_PIECE_KEYS.BRONZE_LAVER]: "Bronze Laver",
  [TABERNACLE_PIECE_KEYS.BROWN_CURTAIN]: "Brown Curtain",
  [TABERNACLE_PIECE_KEYS.FRONT_CURTAIN]: "Front Curtain",
  [TABERNACLE_PIECE_KEYS.FRONT_PILLARS]: "Front Pillars",
  [TABERNACLE_PIECE_KEYS.GREY_CURTAIN]: "Grey Curtain",
  [TABERNACLE_PIECE_KEYS.INCENSE_ALTAR]: "Altar of Incense",
  [TABERNACLE_PIECE_KEYS.INNER_CURTAIN]: "Inner Curtain",
  [TABERNACLE_PIECE_KEYS.INNER_PILLARS]: "Inner Pillars",
  [TABERNACLE_PIECE_KEYS.MENORAH]: "Menorah",
  [TABERNACLE_PIECE_KEYS.PURPLE_CURTAIN]: "Purple Curtain",
  [TABERNACLE_PIECE_KEYS.RED_CURTAIN]: "Red Curtain",
  [TABERNACLE_PIECE_KEYS.RINGS]: "Rings",
  [TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD]: "Table of Showbread",
  [TABERNACLE_PIECE_KEYS.WALLS]: "Walls",
  [TABERNACLE_PIECE_KEYS.GROUND]: "Ground",
  [TABERNACLE_PIECE_KEYS.FENCE]: "Fence",
};
