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
 * again before writing, so a game saved from another tab is not erased.
 * `writeEpoch` is bumped when a write publishes a new list, so a load that
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

    // Always read the server list first. This device's copy can be missing a
    // game saved from another tab, and writing that copy back would delete it.
    const result = await requestLoad(userId);
    if (getUserId() !== userId) throw new SavedGamesWriteError("signed_out");
    if (result.status !== "ok") throw new SavedGamesWriteError("not_loaded");

    const previous = result.games;
    const next = build(previous);
    if (next === previous) return;
    if (getUserId() !== userId) throw new SavedGamesWriteError("signed_out");

    // A load that started before this write must not paint its older list
    // over the one we are about to store.
    writeEpoch += 1;
    preserved = result.preserved;
    savedGames.value = next;
    try {
      await persistGames(userId, [...next, ...preserved], os);
    } catch (error) {
      if (getUserId() === userId) savedGames.value = previous;
      else savedGames.value = [];
      if (error instanceof SavedGamesWriteError) throw error;
      throw new SavedGamesWriteError("persist_failed");
    }
  }

  return {
    syncUser(userId) {
      const token = ++loadToken;
      const writesAtStart = writeEpoch;
      preserved = [];
      savedGames.value = [];
      if (!userId) return Promise.resolve("signed_out");

      return requestLoad(userId).then((result) => {
        if (token !== loadToken || getUserId() !== userId) return "stale";
        if (writesAtStart !== writeEpoch) return "stale";
        if (result.status !== "ok") return "error";
        savedGames.value = result.games;
        preserved = result.preserved;
        return "ok";
      });
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
