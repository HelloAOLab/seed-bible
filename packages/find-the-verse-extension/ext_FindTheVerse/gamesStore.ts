import type { Signal } from "@preact/signals";
import type { CasualOSManager, SeedBibleState } from "seed-bible/managers";
import type { GameDraft, SavedGame } from "./types";

/**
 * Each game is its own record at `find-the-verse/games/<id>`, so sharing one
 * game doesn't open up any other game's answer.
 */
export const GAME_ADDRESS_PREFIX = "find-the-verse/games/";

/**
 * The record holds the secret verse, so a game stays `private` until its
 * creator shares it. Sharing moves that one record to `publicRead`, which
 * lets anyone with the link read it, and lets anyone who knows the creator's
 * user id list their shared games. The marker is the only place a game's
 * shared state is kept. The path after the colon lets the list ask for these
 * records alone.
 */
export const PRIVATE_GAME_MARKER = "private:findTheVerseGames";
export const PUBLIC_GAME_MARKER = "publicRead:findTheVerseGames";

function getMarker(shared: boolean): string {
  return shared ? PUBLIC_GAME_MARKER : PRIVATE_GAME_MARKER;
}

export function gameAddress(id: string): string {
  return `${GAME_ADDRESS_PREFIX}${id}`;
}

export const SHARED_GAME_CREATOR_PARAM = "findTheVerseCreator";
export const SHARED_GAME_PARAM = "findTheVerseGame";

export function sharedGameUrl(
  navigation: SeedBibleState["navigation"],
  creatorId: string,
  gameId: string
): string {
  const link = navigation.linkToBareRoot({
    [SHARED_GAME_CREATOR_PARAM]: creatorId,
    [SHARED_GAME_PARAM]: gameId,
    "autoinstall-find-the-verse-extension": "true",
  });
  return navigation.toShareableUrl(link).toString();
}

/** The game a share link points at, or null when `url` isn't one. */
export function sharedGameFromUrl(
  url: URL
): { creatorId: string; gameId: string } | null {
  const creatorId = url.searchParams.get(SHARED_GAME_CREATOR_PARAM);
  const gameId = url.searchParams.get(SHARED_GAME_PARAM);
  return creatorId && gameId ? { creatorId, gameId } : null;
}

export type LoadGamesResult =
  | { status: "ok"; games: SavedGame[] }
  | { status: "error" };

export type SavedGamesWriteCode =
  | "signed_out"
  | "not_loaded"
  | "privacy_blocked"
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

export function readSavedGame(
  value: unknown,
  shared: boolean
): SavedGame | null {
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
    typeof target.verseText !== "string" ||
    typeof target.translationId !== "string" ||
    !target.translationId
  ) {
    return null;
  }
  return {
    id: game.id,
    // A game without a name still loads; the card falls back to the Show
    // reference button when this is blank.
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
      translationId: target.translationId,
    },
    shared,
  };
}

/** A record the user hasn't written to yet. Not a failure. */
function isMissing(errorCode: unknown): boolean {
  return errorCode === "data_not_found" || errorCode === "record_not_found";
}

/**
 * A refusal caused by an account's privacy settings: the creator's account
 * can't publish data, or the creator's or reader's account can't use public
 * data. `getData`'s failure type leaves out `reason`, but the server sends it,
 * so this reads the result as `unknown`.
 */
function isPrivacyRefusal(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const { errorCode, reason } = result as {
    errorCode?: unknown;
    reason?: { type?: unknown } | null;
  };
  return (
    errorCode === "not_authorized" &&
    reason?.type === "disabled_privacy_feature"
  );
}

function writeFailure(result: unknown): SavedGamesWriteError {
  return new SavedGamesWriteError(
    isPrivacyRefusal(result) ? "privacy_blocked" : "persist_failed"
  );
}

/** Newest first. */
function byNewest(a: SavedGame, b: SavedGame): number {
  return b.createdAtMs - a.createdAtMs;
}

/**
 * Every saved game of `userId`. A record that can't be read as a game is
 * skipped: it only affects itself, and saving never writes over it.
 *
 * `ok` with an empty list only means the server answered and there are no
 * games yet. A network or server failure is `error`.
 */
export async function loadGames(
  userId: string,
  os: CasualOSManager
): Promise<LoadGamesResult> {
  const games: SavedGame[] = [];
  const loadByMarker = async (marker: string): Promise<SavedGame[]> => {
    let lastAddress: string | undefined;
    let listed = 0;
    const currGames: SavedGame[] = [];
    while (true) {
      const page = await os.listDataByMarker(userId, marker, lastAddress);
      if (!page || page.success === false) {
        if (page && isMissing(page.errorCode)) break;
        throw new Error();
      }
      if (page.items.length === 0) break;
      for (const item of page.items) {
        if (!item.address.startsWith(GAME_ADDRESS_PREFIX)) continue;
        const saved = readSavedGame(item.data, marker === PUBLIC_GAME_MARKER);
        if (saved && gameAddress(saved.id) === item.address)
          currGames.push(saved);
      }
      listed += page.items.length;
      if (listed >= page.totalCount) break;
      lastAddress = page.items[page.items.length - 1]?.address;
    }
    return currGames;
  };
  try {
    const [privateResults, publicResults] = await Promise.all([
      loadByMarker(PRIVATE_GAME_MARKER),
      loadByMarker(PUBLIC_GAME_MARKER),
    ]);
    games.push(...privateResults, ...publicResults);
  } catch {
    return { status: "error" };
  }
  return { status: "ok", games: games.sort(byNewest) };
}

/** One game, or null when it isn't on the server (or isn't readable). */
async function loadGame(
  userId: string,
  id: string,
  os: CasualOSManager
): Promise<{ status: "ok"; game: SavedGame | null } | { status: "error" }> {
  try {
    const result = await os.getData(userId, gameAddress(id));
    if (!result || result.success === false) {
      return result && isMissing(result.errorCode)
        ? { status: "ok", game: null }
        : { status: "error" };
    }
    const shared = result.markers.includes(PUBLIC_GAME_MARKER);
    const game = readSavedGame(result.data, shared);
    return { status: "ok", game };
  } catch {
    return { status: "error" };
  }
}

export async function persistGame(
  userId: string,
  game: SavedGame,
  os: CasualOSManager
): Promise<void> {
  const { shared, ...data } = game;
  const result = await os.recordData(userId, gameAddress(game.id), data, {
    marker: getMarker(shared),
  });
  if (result && result.success === false) {
    throw writeFailure(result);
  }
}

/**
 * How the server answers a link to a game that isn't public. A private record
 * is `not_logged_in` for a signed-out reader and `not_authorized` for a
 * signed-in one.
 */
function isRefusedOrMissing(errorCode: unknown): boolean {
  return (
    isMissing(errorCode) ||
    errorCode === "not_authorized" ||
    errorCode === "not_logged_in"
  );
}

export type SharedGameResult =
  | { status: "ok"; game: SavedGame }
  | { status: "not_shared" }
  | { status: "privacy_blocked" }
  | { status: "error" };

/**
 * A game opened from a share link. A game that was deleted, unshared, never
 * shared, or can't be read as a game is `not_shared`, even for its creator,
 * so the link stops working as soon as sharing stops.
 */
export async function loadSharedGame(
  creatorId: string,
  gameId: string,
  os: CasualOSManager
): Promise<SharedGameResult> {
  try {
    const result = await os.getData(creatorId, gameAddress(gameId));
    if (!result || result.success === false) {
      if (isPrivacyRefusal(result)) return { status: "privacy_blocked" };
      if (result && isRefusedOrMissing(result.errorCode)) {
        return { status: "not_shared" };
      }
      return { status: "error" };
    }
    if (!result.markers.includes(PUBLIC_GAME_MARKER)) {
      return { status: "not_shared" };
    }
    const game = readSavedGame(result.data, true);
    if (!game || game.id !== gameId) return { status: "not_shared" };
    return { status: "ok", game };
  } catch {
    return { status: "error" };
  }
}

export async function eraseGame(
  userId: string,
  id: string,
  os: CasualOSManager
): Promise<void> {
  const result = await os.eraseData(userId, gameAddress(id));
  if (result && result.success === false && !isMissing(result.errorCode)) {
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
 * edited, so an edit replaces the game instead of adding a copy. `id` keeps
 * an edited game's id when its record is already gone.
 */
export function toSavedGame(
  draft: GameDraft,
  existing: SavedGame | undefined,
  nowMs: number = Date.now(),
  id?: string
): SavedGame {
  return {
    id: existing?.id ?? id ?? newGameId(),
    name: draft.name.trim(),
    targetVerse: { ...draft.targetVerse },
    steps: draft.steps.map((step) => ({ hint: step.hint })),
    createdAtMs: existing?.createdAtMs ?? nowMs,
    shared: existing?.shared ?? false,
  };
}

export type SyncUserResult = "ok" | "error" | "signed_out" | "stale";

export type SavedGamesAction = "save" | "delete" | "share";

const FAILED_KEYS: Record<SavedGamesAction, string> = {
  save: "save-failed",
  delete: "delete-failed",
  share: "share-failed",
};

const FAILED_MESSAGES: Record<SavedGamesAction, string> = {
  save: "Couldn't save that game. Try again.",
  delete: "Couldn't delete that game. Try again.",
  share: "Couldn't change sharing for that game. Try again.",
};

export function savedGamesErrorKey(
  error: unknown,
  action: SavedGamesAction
): string {
  if (error instanceof SavedGamesWriteError) {
    if (error.code === "signed_out") return "sign-in-to-save";
    if (error.code === "not_loaded") return "save-blocked-not-loaded";
    if (error.code === "privacy_blocked") return "share-blocked-privacy";
  }
  return FAILED_KEYS[action];
}

/** English fallback. The panel shows this through the extension's `en` strings. */
export function savedGamesErrorMessage(
  error: unknown,
  action: SavedGamesAction
): string {
  if (error instanceof SavedGamesWriteError) {
    if (error.code === "signed_out") return "Sign in to save games";
    if (error.code === "not_loaded") {
      return "Couldn't load that game, so nothing was changed.";
    }
    if (error.code === "privacy_blocked") {
      return "Your account's privacy settings don't allow sharing games.";
    }
  }
  return FAILED_MESSAGES[action];
}

export async function setGamePrivacy(
  userId: string,
  gameId: string,
  os: CasualOSManager,
  shared: boolean
) {
  const marker = getMarker(shared);

  const gameData = await os.getData(userId, gameAddress(gameId));
  if (!gameData.success) {
    throw new SavedGamesWriteError("not_loaded");
  }

  if (gameData.markers.includes(marker)) return;

  const result = await os.recordData(
    userId,
    gameAddress(gameId),
    gameData.data,
    {
      marker,
    }
  );
  if (result && result.success === false) {
    throw writeFailure(result);
  }
}

export interface SavedGamesController {
  syncUser(userId: string | null): Promise<SyncUserResult>;
  /**
   * `editingId` is the game being edited. Its creation date is read from the
   * server inside the write, so it is kept even if the list hasn't loaded.
   */
  save(draft: GameDraft, editingId: string | null): Promise<void>;
  remove(id: string): Promise<void>;
  setPrivacy(gameId: string, shared: boolean): Promise<void>;
}

/**
 * Loads the saved-game list and writes single games.
 *
 * A save or delete only writes its own game's record, so it can't lose a game
 * another device saved. Writes run one at a time. A reload waits until they
 * finish, then fetches; for the same user it leaves the list on screen while
 * that fetch is in flight. `writeEpoch` is bumped when a write changes the
 * list, so a load that started earlier cannot paint its older list on top.
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

  function currentList(userId: string): SavedGame[] {
    return listUser === userId ? savedGames.peek() : [];
  }

  function publish(userId: string, games: SavedGame[]) {
    writeEpoch += 1;
    listUser = userId;
    savedGames.value = games;
  }

  /** Shows `next` right away and puts `previous` back if the write fails. */
  async function write(
    userId: string,
    previous: SavedGame[],
    next: SavedGame[],
    run: () => Promise<void>
  ) {
    publish(userId, next);
    try {
      await run();
    } catch (error) {
      if (getUserId() === userId) {
        publish(userId, previous);
      } else {
        listUser = null;
        savedGames.value = [];
      }
      if (error instanceof SavedGamesWriteError) throw error;
      throw new SavedGamesWriteError("persist_failed");
    }
  }

  const setPrivacy: SavedGamesController["setPrivacy"] = (gameId, shared) => {
    return enqueue(async () => {
      const userId = getUserId();
      if (!userId) throw new SavedGamesWriteError("signed_out");
      const previous = currentList(userId);
      const next = previous.map((game) =>
        game.id === gameId ? { ...game, shared } : game
      );
      await write(userId, previous, next, () =>
        setGamePrivacy(userId, gameId, os, shared)
      );
    });
  };

  return {
    syncUser(userId) {
      const token = ++loadToken;
      if (!userId) {
        listUser = null;
        savedGames.value = [];
        return Promise.resolve("signed_out");
      }
      // Same account: keep the cards up while the refresh is in flight.
      // A different account must not see the previous list.
      if (listUser !== userId) {
        listUser = null;
        savedGames.value = [];
      }

      const startLoad = (): Promise<SyncUserResult> => {
        if (token !== loadToken || getUserId() !== userId) {
          return Promise.resolve("stale");
        }
        const writesAtStart = writeEpoch;
        return requestLoad(userId).then((result) => {
          if (token !== loadToken || getUserId() !== userId) return "stale";
          // A write landed mid-load, so this result may be missing it. Fetch
          // again once writes finish; until then the list on screen may be
          // only what was written.
          if (writesAtStart !== writeEpoch) return writeQueue.then(startLoad);
          if (result.status !== "ok") return "error";
          listUser = userId;
          savedGames.value = result.games;
          return "ok";
        });
      };
      // Nothing is being saved: start the fetch now. Waiting on an idle queue
      // would put the list a turn behind the panel opening.
      if (activeWrites === 0) return startLoad();
      return writeQueue.then(startLoad);
    },

    save(draft, editingId) {
      return enqueue(async () => {
        const userId = getUserId();
        if (!userId) throw new SavedGamesWriteError("signed_out");

        let existing: SavedGame | undefined;
        if (editingId) {
          const loaded = await loadGame(userId, editingId, os);
          if (getUserId() !== userId) {
            throw new SavedGamesWriteError("signed_out");
          }
          if (loaded.status !== "ok") {
            throw new SavedGamesWriteError("not_loaded");
          }
          existing = loaded.game ?? undefined;
        }

        const saved = toSavedGame(
          draft,
          existing,
          Date.now(),
          editingId ?? undefined
        );
        const previous = currentList(userId);
        const index = previous.findIndex((game) => game.id === saved.id);
        const next =
          index >= 0
            ? previous.map((game, i) => (i === index ? saved : game))
            : [saved, ...previous];
        await write(userId, previous, next, () =>
          persistGame(userId, saved, os)
        );
      });
    },

    remove(id) {
      return enqueue(async () => {
        const userId = getUserId();
        if (!userId) throw new SavedGamesWriteError("signed_out");
        const previous = currentList(userId);
        const next = previous.filter((game) => game.id !== id);
        await write(userId, previous, next, () => eraseGame(userId, id, os));
      });
    },

    setPrivacy,
  };
}
