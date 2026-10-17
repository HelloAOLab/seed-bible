import type { Signal } from "@preact/signals";
import type { CasualOSManager } from "seed-bible/managers";
import type { SavedGame } from "./types";

export const GAMES_ADDRESS = "find-the-verse-games";

/**
 * The record holds the secret verse. `private` keeps it off the public
 * records API; `publicRead` would let anyone who knows the creator's user id
 * read every answer. There is no sharing flow that needs the public marker.
 */
export const GAMES_MARKER = "private";

export type LoadGamesResult =
  | { status: "ok"; games: SavedGame[] }
  | { status: "error" };

export type SavedGamesWriteCode =
  | "signed_out"
  | "not_loaded"
  | "persist_failed";

export class SavedGamesWriteError extends Error {
  readonly code: SavedGamesWriteCode;

  constructor(code: SavedGamesWriteCode) {
    super(code);
    this.name = "SavedGamesWriteError";
    this.code = code;
  }
}

function isSavedGame(value: unknown): value is SavedGame {
  if (!value || typeof value !== "object") return false;
  const game = value as Record<string, unknown>;
  const target = game.targetVerse as Record<string, unknown> | null;
  return (
    typeof game.id === "string" &&
    typeof game.createdAtMs === "number" &&
    Array.isArray(game.steps) &&
    !!target &&
    typeof target === "object" &&
    typeof target.bookId === "string" &&
    typeof target.chapterNumber === "number" &&
    typeof target.verseNumber === "number"
  );
}

/**
 * `ok` with an empty list only means the server answered and there is no
 * record yet. A network or server failure is `error`, so a later save can
 * refuse to write instead of replacing every saved game with the new one.
 */
export async function loadGames(
  userId: string,
  os: CasualOSManager
): Promise<LoadGamesResult> {
  try {
    const result = await os.getData(userId, GAMES_ADDRESS);
    if (!result || result.success === false) {
      return result && result.errorCode === "data_not_found"
        ? { status: "ok", games: [] }
        : { status: "error" };
    }
    if (result.data == null) return { status: "ok", games: [] };
    const data = result.data as { games?: unknown };
    if (!Array.isArray(data.games)) return { status: "error" };
    return { status: "ok", games: data.games.filter(isSavedGame) };
  } catch {
    return { status: "error" };
  }
}

export async function persistGames(
  userId: string,
  games: SavedGame[],
  os: CasualOSManager
): Promise<void> {
  const result = await os.recordData(
    userId,
    GAMES_ADDRESS,
    { games },
    {
      marker: GAMES_MARKER,
    }
  );
  if (result && result.success === false) {
    throw new SavedGamesWriteError("persist_failed");
  }
}

/**
 * Keeps the id and original creation date when `existing` is the game being
 * edited. A new id on every save is what left the old game in the list.
 */
export function toSavedGame(
  draft: Pick<SavedGame, "targetVerse" | "steps">,
  existing: SavedGame | undefined,
  nowMs: number = Date.now()
): SavedGame {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    targetVerse: { ...draft.targetVerse },
    steps: draft.steps.map((step) => ({ hint: step.hint })),
    createdAtMs: existing?.createdAtMs ?? nowMs,
  };
}

export type SyncUserResult = "ok" | "error" | "signed_out" | "stale";

export function savedGamesErrorKey(
  error: unknown,
  action: "save" | "delete"
): string {
  if (error instanceof SavedGamesWriteError) {
    if (error.code === "signed_out") return "sign-in-to-save";
    if (error.code === "not_loaded") return "save-blocked-not-loaded";
  }
  return action === "save" ? "save-failed" : "delete-failed";
}

/** English fallback. The panel shows this through the extension's `en` strings. */
export function savedGamesErrorMessage(
  error: unknown,
  action: "save" | "delete"
): string {
  if (error instanceof SavedGamesWriteError) {
    if (error.code === "signed_out") return "Sign in to save games";
    if (error.code === "not_loaded") {
      return "Couldn't load your saved games, so nothing was changed.";
    }
  }
  return action === "save"
    ? "Couldn't save that game. Try again."
    : "Couldn't delete that game. Try again.";
}

export interface SavedGamesController {
  syncUser(userId: string | null): Promise<SyncUserResult>;
  save(saved: SavedGame): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * Loads and writes the whole saved-game list.
 *
 * The in-memory list starts empty. Writing it before a successful load (or
 * after a failed one) would store only the game in hand and erase the rest.
 * `writeEpoch` is bumped when a write publishes a new list, so a load that
 * started earlier cannot apply its snapshot on top.
 */
export function createSavedGamesController(
  savedGames: Signal<SavedGame[]>,
  getUserId: () => string | null,
  os: CasualOSManager
): SavedGamesController {
  let loadedForUser: string | null = null;
  let loadToken = 0;
  let writeEpoch = 0;
  let writeQueue: Promise<void> = Promise.resolve();
  let inflight: {
    userId: string;
    promise: Promise<LoadGamesResult>;
  } | null = null;

  function requestLoad(userId: string): Promise<LoadGamesResult> {
    if (inflight?.userId === userId) return inflight.promise;
    const promise = loadGames(userId, os).finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
    inflight = { userId, promise };
    return promise;
  }

  function enqueue(task: () => Promise<void>): Promise<void> {
    const run = writeQueue.then(task, task);
    writeQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async function write(
    build: (current: SavedGame[]) => SavedGame[]
  ): Promise<void> {
    const userId = getUserId();
    if (!userId) throw new SavedGamesWriteError("signed_out");

    if (loadedForUser !== userId) {
      const writesAtStart = writeEpoch;
      const result = await requestLoad(userId);
      if (getUserId() !== userId) throw new SavedGamesWriteError("signed_out");
      if (result.status !== "ok") throw new SavedGamesWriteError("not_loaded");
      if (writesAtStart === writeEpoch && loadedForUser !== userId) {
        savedGames.value = result.games;
        loadedForUser = userId;
      } else if (loadedForUser !== userId) {
        throw new SavedGamesWriteError("not_loaded");
      }
    }

    const previous = savedGames.peek();
    const next = build(previous);
    if (next === previous) return;
    if (getUserId() !== userId) throw new SavedGamesWriteError("signed_out");

    writeEpoch += 1;
    savedGames.value = next;
    try {
      await persistGames(userId, next, os);
    } catch (error) {
      if (getUserId() === userId) savedGames.value = previous;
      if (error instanceof SavedGamesWriteError) throw error;
      throw new SavedGamesWriteError("persist_failed");
    }
  }

  return {
    syncUser(userId) {
      const token = ++loadToken;
      const writesAtStart = writeEpoch;
      loadedForUser = null;
      savedGames.value = [];
      if (!userId) return Promise.resolve("signed_out");

      return requestLoad(userId).then((result) => {
        if (token !== loadToken || getUserId() !== userId) return "stale";
        if (writesAtStart !== writeEpoch) return "stale";
        if (result.status !== "ok") return "error";
        savedGames.value = result.games;
        loadedForUser = userId;
        return "ok";
      });
    },

    save(saved) {
      return enqueue(() =>
        write((current) => [
          saved,
          ...current.filter((game) => game.id !== saved.id),
        ])
      );
    },

    remove(id) {
      return enqueue(() =>
        write((current) => {
          if (!current.some((game) => game.id === id)) return current;
          return current.filter((game) => game.id !== id);
        })
      );
    },
  };
}
