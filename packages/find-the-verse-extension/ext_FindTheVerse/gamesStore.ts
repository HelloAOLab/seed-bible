import type { CasualOSManager } from "seed-bible/managers";
import type { SavedGame } from "./types";

const STORAGE_ADDRESS = "find-the-verse-games";

function isSavedGame(v: unknown): v is SavedGame {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  const tv = g.targetVerse as Record<string, unknown> | null;
  return (
    typeof g.id === "string" &&
    typeof g.createdAtMs === "number" &&
    Array.isArray(g.steps) &&
    !!tv &&
    typeof tv === "object" &&
    typeof tv.bookId === "string" &&
    typeof tv.chapterNumber === "number" &&
    typeof tv.verseNumber === "number"
  );
}

export async function loadGames(
  userId: string,
  os: CasualOSManager
): Promise<SavedGame[]> {
  try {
    const result = await os.getData(userId, STORAGE_ADDRESS);
    if (!result.success || !result.data) return [];
    const data = result.data as { games?: unknown };
    if (!Array.isArray(data.games)) return [];
    return data.games.filter(isSavedGame);
  } catch {
    return [];
  }
}

export async function persistGames(
  userId: string,
  games: SavedGame[],
  os: CasualOSManager
): Promise<void> {
  const result = await os.recordData(
    userId,
    STORAGE_ADDRESS,
    { games },
    {
      marker: "publicRead",
    }
  );
  if (result && result.success === false) {
    throw new Error(`Failed to save games: ${result.errorCode}`);
  }
}
