import type { Signal } from "@preact/signals";
import type { CasualOSManager } from "seed-bible/managers";
import type { GameDraft, SavedGame } from "./types";

export const GAMES_ADDRESS = "find-the-verse-games";

/**
 * The record holds the secret verse. `private` keeps it off the public
 * records API; `publicRead` would let anyone who knows the creator's user id
 * read every answer. There is no sharing flow that needs the public marker.
 */
export const GAMES_MARKER = "private";

export type LoadGamesResult =
  | { status: "ok"; games: SavedGame[]; preserved: unknown[] }
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

function isGameStep(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { hint?: unknown }).hint === "string";
}

function readSavedGame(value: unknown): SavedGame | null {
  if (!value || typeof value !== "object") return null;
  const game = value as Record<string, unknown>;
  const target = game.targetVerse as Record<string, unknown> | null;
  const steps = game.steps;
  if (
    typeof game.id !== "string" ||
    typeof game.createdAtMs !== "number" ||
    !Array.isArray(steps) ||
    steps.length < 1 ||
    !steps.every(isGameStep) ||
    !target ||
    typeof target !== "object" ||
    typeof target.bookId !== "string" ||
    typeof target.chapterNumber !== "number" ||
    typeof target.verseNumber !== "number" ||
    typeof target.verseText !== "string"
  ) {
    return null;
  }
  return {
    id: game.id,
    // Games saved before names existed still load; the card falls back to
    // the Show reference button when this is blank.
    name: typeof game.name === "string" ? game.name : "",
    createdAtMs: game.createdAtMs,
    steps: steps.map((step) => ({
      hint: (step as { hint: string }).hint,
    })),
    targetVerse: {
      bookId: target.bookId,
      chapterNumber: target.chapterNumber,
      verseNumber: target.verseNumber,
      verseText: target.verseText,
    },
  };
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
        ? { status: "ok", games: [], preserved: [] }
        : { status: "error" };
    }
    if (result.data == null) return { status: "ok", games: [], preserved: [] };
    const data = result.data as { games?: unknown };
    if (!Array.isArray(data.games)) return { status: "error" };
    const games: SavedGame[] = [];
    const preserved: unknown[] = [];
    for (const entry of data.games) {
      const saved = readSavedGame(entry);
      if (saved) games.push(saved);
      else preserved.push(entry);
    }
    return { status: "ok", games, preserved };
  } catch {
    return { status: "error" };
  }
}

export async function persistGames(
  userId: string,
  games: readonly unknown[],
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
 * `crypto.randomUUID` is missing on plain http pages. The fallback still
 * gives a new id without pulling in the uuid package.
 */
function newGameId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Keeps the id and original creation date when `existing` is the game being
 * edited, so an edit replaces the game instead of adding a copy.
 */
export function toSavedGame(
  draft: GameDraft,
  existing: SavedGame | undefined,
  nowMs: number = Date.now()
): SavedGame {
  return {
    id: existing?.id ?? newGameId(),
    name: draft.name.trim(),
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
  /**
   * `editingId` is the game being edited. The match happens inside the write,
   * after the saved list has loaded, so a list that was empty at click time
   * still replaces that game instead of inserting a second copy.
   */
  save(draft: GameDraft, editingId: string | null): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * Loads and writes the whole saved-game list.
 *
 * The in-memory list starts empty. Each save and delete loads the server list
 * on its own, so it never builds on a panel reload that started earlier.
 * A reload waits until those writes finish, then fetches. For the same user
 * it leaves the list on screen while that fetch is in flight.
 * `writeEpoch` is bumped when a write publishes a list, so a load that
 * started earlier cannot apply its snapshot on top.
 */
export function createSavedGamesController(
  savedGames: Signal<SavedGame[]>,
  getUserId: () => string | null,
  os: CasualOSManager
): SavedGamesController {
  let loadToken = 0;
  let writeEpoch = 0;
  let writeQueue: Promise<void> = Promise.resolve();
  let listUser: string | null = null;
  let preserved: unknown[] = [];
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

  let activeWrites = 0;

  function enqueue(task: () => Promise<void>): Promise<void> {
    activeWrites += 1;
    const run = writeQueue.then(task, task);
    writeQueue = run.then(
      () => {
        activeWrites -= 1;
      },
      () => {
        activeWrites -= 1;
      }
    );
    return run;
  }

  function publish(
    userId: string,
    games: SavedGame[],
    nextPreserved: unknown[]
  ) {
    // A load that started before this publish must not paint its older list
    // over the one we are storing.
    writeEpoch += 1;
    preserved = nextPreserved;
    listUser = userId;
    savedGames.value = games;
  }

  async function write(
    build: (current: SavedGame[]) => SavedGame[]
  ): Promise<void> {
    const userId = getUserId();
    if (!userId) throw new SavedGamesWriteError("signed_out");

    // Own request, not the panel's. A reload that is already in flight may
    // have read the server before this save, and building on that copy would
    // delete the game when it is written back.
    const result = await loadGames(userId, os);
    if (getUserId() !== userId) throw new SavedGamesWriteError("signed_out");
    if (result.status !== "ok") throw new SavedGamesWriteError("not_loaded");

    const previous = result.games;
    const next = build(previous);
    if (getUserId() !== userId) throw new SavedGamesWriteError("signed_out");
    // The game is already gone on the server. Still show that list, or the
    // card stays and Delete looks like it did nothing.
    if (next === previous) {
      publish(userId, previous, result.preserved);
      return;
    }

    publish(userId, next, result.preserved);
    try {
      await persistGames(userId, [...next, ...preserved], os);
    } catch (error) {
      if (getUserId() === userId) {
        listUser = userId;
        savedGames.value = previous;
      } else {
        listUser = null;
        savedGames.value = [];
      }
      if (error instanceof SavedGamesWriteError) throw error;
      throw new SavedGamesWriteError("persist_failed");
    }
  }

  return {
    syncUser(userId) {
      const token = ++loadToken;
      if (!userId) {
        listUser = null;
        preserved = [];
        savedGames.value = [];
        return Promise.resolve("signed_out");
      }
      // Same account: keep the cards up while the refresh is in flight.
      // A different account must not see the previous list.
      if (listUser !== userId) {
        listUser = null;
        preserved = [];
        savedGames.value = [];
      }

      // Nothing is being saved: start the fetch now. Waiting on an idle queue
      // would put the list a turn behind the panel opening.
      const startLoad = (): Promise<SyncUserResult> => {
        if (token !== loadToken || getUserId() !== userId) {
          return Promise.resolve("stale");
        }
        // After the writes that were already running. A save that starts
        // during the fetch below bumps the counter and this result is dropped.
        const writesAtStart = writeEpoch;
        return requestLoad(userId).then((result) => {
          if (token !== loadToken || getUserId() !== userId) return "stale";
          if (writesAtStart !== writeEpoch) return "stale";
          if (result.status !== "ok") return "error";
          listUser = userId;
          preserved = result.preserved;
          savedGames.value = result.games;
          return "ok";
        });
      };
      if (activeWrites === 0) return startLoad();
      return writeQueue.then(startLoad);
    },

    save(draft, editingId) {
      return enqueue(() =>
        write((current) => {
          const saved = toSavedGame(
            draft,
            editingId
              ? current.find((game) => game.id === editingId)
              : undefined
          );
          return [saved, ...current.filter((game) => game.id !== saved.id)];
        })
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
