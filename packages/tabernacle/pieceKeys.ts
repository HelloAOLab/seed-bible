export const TABERNACLE_PIECE_KEYS = {
  ALTAR_OF_SACRIFICE: "altar-of-sacrifice",
  ARK_OF_COVENANT: "ark-of-covenant",
  BARS: "bars",
  BRONZE_LAVER: "bronze-laver",
  BROWN_CURTAIN: "brown-curtain",
  FRONT_CURTAIN: "front-curtain",
  FRONT_PILLARS: "front-pillars",
  GREY_CURTAIN: "grey-curtain",
  INCENSE_ALTAR: "incense-altar",
  INNER_CURTAIN: "inner-curtain",
  INNER_PILLARS: "inner-pillars",
  MENORAH: "menorah",
  PURPLE_CURTAIN: "purple-curtain",
  RED_CURTAIN: "red-curtain",
  RINGS: "rings",
  TABLE_OF_SHOWBREAD: "table-of-showbread",
  WALLS: "walls",
  GROUND: "ground",
  FENCE: "fence",
} as const;

export type TabernaclePieceKey =
  (typeof TABERNACLE_PIECE_KEYS)[keyof typeof TABERNACLE_PIECE_KEYS];
