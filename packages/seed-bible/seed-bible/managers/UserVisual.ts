/**
 * Pure visual identity for session participants: a deterministic color + icon
 * derived from a stable key (user ID or connection ID). Extracted into its own
 * module so both SessionsManager and Utils can import it without an import loop
 * (SessionsManager already imports from Utils).
 */

export interface ConnectionSessionUserVisual {
  defaultIcon: string;
  color: string;
  colorName: string;
}

// NOTE: Keep icons updated in the translation files (e.g. `en.json`)
const USER_ANIMAL_ICONS = [
  "forest", // tree
  "park", // log
  "eco", // leaf
  "pets", // dog
  "cruelty_free", // bunny-style
  "local_cafe", // coffee
  "local_florist", // flower
  "grass", // grass
  "potted_plant", // plant
  "nature", // tree
] as const;

// NOTE: Keep colors updated in the translation files (e.g. `en.json`)
const USER_PRESENCE_COLORS = [
  ["#34D399", "emerald"], // emerald
  ["#60A5FA", "blue"], // blue
  ["#F472B6", "pink"], // pink
  ["#FBBF24", "amber"], // amber
  ["#A78BFA", "violet"], // violet
  ["#F87171", "red"], // red
  ["#10B981", "green"], // green
  ["#F59E0B", "orange"], // orange
  ["#06B6D4", "cyan"], // cyan
  ["#EC4899", "rose"], // rose
  ["#8B5CF6", "purple"], // purple
  ["#14B8A6", "teal"], // teal
] as const;

function hashUserKey(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Pure-hash user visual. Same input → same output, forever. The icon and
 * color are derived independently from the hash so small changes to the
 * key (e.g. user id suffix) distribute across the whole palette.
 */
export function getUserAnimalVisual(key: string): ConnectionSessionUserVisual {
  const normalized = key && key.length > 0 ? key : "anonymous";
  const hash = hashUserKey(normalized);
  const iconIndex = hash % USER_ANIMAL_ICONS.length;
  const colorIndex =
    Math.floor(hash / USER_ANIMAL_ICONS.length) % USER_PRESENCE_COLORS.length;
  const color = USER_PRESENCE_COLORS[colorIndex]!;
  return {
    defaultIcon: USER_ANIMAL_ICONS[iconIndex]!,
    color: color[0],
    colorName: color[1],
  };
}

/**
 * Given a connected-session user object, returns the SAME key that the
 * sidebar self-avatar uses for this person — user ID when known, connection
 * ID for anonymous guests. This guarantees visual consistency between "how I
 * see myself in the sidebar" and "how others see me in the connected-users
 * row".
 */
export function getConnectedUserVisualKey(user: {
  userId?: string | null;
  connectionId?: string | null;
}): string {
  return user.userId ?? user.connectionId ?? "anonymous";
}
