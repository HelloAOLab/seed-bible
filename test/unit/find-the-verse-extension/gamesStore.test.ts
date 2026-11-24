import { signal } from "@preact/signals";
import { describe, expect, it, vi } from "vitest";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import {
  createSavedGamesController,
  gameAddress,
  loadGames,
  loadSharedGame,
  PRIVATE_GAME_MARKER,
  PUBLIC_GAME_MARKER,
  savedGamesErrorMessage,
  SavedGamesWriteError,
  toSavedGame,
} from "@packages/find-the-verse-extension/ext_FindTheVerse/gamesStore";
import type { SavedGame } from "@packages/find-the-verse-extension/ext_FindTheVerse/types";

function makeGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    id: "game-1",
    name: "Youth group",
    createdAtMs: 1_000,
    shared: false,
    steps: [{ hint: "" }],
    targetVerse: {
      bookId: "JHN",
      chapterNumber: 1,
      verseNumber: 1,
      verseText: "In the beginning",
      translationId: "BSB",
    },
    ...overrides,
  };
}

/** What the server holds for a game: the shared state lives in its marker. */
function storedData(game: SavedGame) {
  const { shared: _shared, ...data } = game;
  return data;
}

/** How the server refuses an account whose privacy settings block public data. */
function privacyRefusal(privacyFeature: "publishData" | "allowPublicData") {
  return {
    success: false,
    errorCode: "not_authorized",
    errorMessage: "You are not authorized to perform this action.",
    reason: { type: "disabled_privacy_feature", privacyFeature },
  } as never;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function draftOf(game: SavedGame) {
  return { name: game.name, targetVerse: game.targetVerse, steps: game.steps };
}

/**
 * A records server for one user: data items by address, each with markers.
 * Lists one page of `pageSize` items at a time, like the real server.
 */
function fakeRecords(pageSize = 50) {
  const items = new Map<string, { data: unknown; markers: string[] }>();
  const os = {
    listDataByMarker: vi.fn(
      async (_record: string, marker: string, lastAddress?: string) => {
        const matching = [...items.entries()]
          .filter(([, item]) => item.markers.includes(marker))
          .sort(([a], [b]) => a.localeCompare(b));
        const after = lastAddress
          ? matching.filter(([address]) => address > lastAddress)
          : matching;
        return {
          success: true as const,
          items: after
            .slice(0, pageSize)
            .map(([address, item]) => ({ address, data: item.data })),
          totalCount: matching.length,
        };
      }
    ),
    getData: vi.fn(async (_record: string, address: string) => {
      const item = items.get(address);
      return item
        ? { success: true as const, data: item.data, markers: item.markers }
        : { success: false as const, errorCode: "data_not_found" };
    }),
    recordData: vi.fn(
      async (
        _record: string,
        address: string,
        data: unknown,
        options: { marker?: string }
      ) => {
        items.set(address, {
          data,
          markers: options.marker ? [options.marker] : [],
        });
        return { success: true as const };
      }
    ),
    eraseData: vi.fn(async (_record: string, address: string) => {
      if (!items.delete(address)) {
        return { success: false as const, errorCode: "data_not_found" };
      }
      return { success: true as const };
    }),
  };
  const put = (address: string, data: unknown) =>
    items.set(address, { data, markers: [PRIVATE_GAME_MARKER] });
  return {
    os,
    items,
    put,
    putGame: (game: SavedGame) =>
      items.set(gameAddress(game.id), {
        data: storedData(game),
        markers: [game.shared ? PUBLIC_GAME_MARKER : PRIVATE_GAME_MARKER],
      }),
    asOs: os as unknown as CasualOSManager,
  };
}

function setup(userId: string | null = "user-1", pageSize?: number) {
  const savedGames = signal<SavedGame[]>([]);
  const currentUser = signal(userId);
  const records = fakeRecords(pageSize);
  const controller = createSavedGamesController(
    savedGames,
    () => currentUser.value,
    records.asOs
  );
  return { savedGames, currentUser, records, controller };
}

describe("loadGames", () => {
  it("treats a user with no record yet as an empty list, and any other failure as an error", async () => {
    const { os, asOs } = fakeRecords();

    os.listDataByMarker.mockResolvedValueOnce({
      success: false,
      errorCode: "record_not_found",
    } as never);
    await expect(loadGames("user-1", asOs)).resolves.toEqual({
      status: "ok",
      games: [],
    });

    os.listDataByMarker.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    } as never);
    await expect(loadGames("user-1", asOs)).resolves.toEqual({
      status: "error",
    });

    os.listDataByMarker.mockRejectedValueOnce(new Error("offline"));
    await expect(loadGames("user-1", asOs)).resolves.toEqual({
      status: "error",
    });
  });

  it("skips records that are not saved games, newest game first", async () => {
    const { put, putGame, asOs } = fakeRecords();
    putGame(makeGame({ id: "older", createdAtMs: 1 }));
    putGame(makeGame({ id: "newer", createdAtMs: 2 }));
    put(gameAddress("broken"), { id: "broken", steps: [] });
    put(gameAddress("not-a-list"), { games: { not: "a list" } });
    // A valid game stored under another game's address is not that game.
    put(gameAddress("elsewhere"), makeGame({ id: "someone-else" }));

    const result = await loadGames("user-1", asOs);

    expect(result).toEqual({
      status: "ok",
      games: [
        makeGame({ id: "newer", createdAtMs: 2 }),
        makeGame({ id: "older", createdAtMs: 1 }),
      ],
    });
  });

  it("keeps a game without a name, with a blank name", async () => {
    const { put, asOs } = fakeRecords();
    const { name: _name, ...unnamed } = makeGame({ id: "unnamed" });
    put(gameAddress("unnamed"), unnamed);

    await expect(loadGames("user-1", asOs)).resolves.toEqual({
      status: "ok",
      games: [makeGame({ id: "unnamed", name: "" })],
    });
  });

  it("reads the translation a game's verse text came from, and skips a game without one", async () => {
    const { put, putGame, asOs } = fakeRecords();
    const kjv = makeGame({ id: "kjv" });
    kjv.targetVerse.translationId = "KJV";
    putGame(kjv);
    const { translationId: _translationId, ...noTranslation } =
      makeGame().targetVerse;
    put(
      gameAddress("no-translation"),
      makeGame({ id: "no-translation", targetVerse: noTranslation as never })
    );

    const result = await loadGames("user-1", asOs);

    expect(result).toEqual({ status: "ok", games: [kjv] });
  });

  it("reads every page of private and shared games", async () => {
    const { os, putGame, asOs } = fakeRecords(2);
    for (let i = 0; i < 5; i++) {
      putGame(makeGame({ id: `g${i}`, createdAtMs: i, shared: i % 2 === 1 }));
    }

    const result = await loadGames("user-1", asOs);

    expect(result.status).toBe("ok");
    expect(
      result.status === "ok" && result.games.map((game) => game.id)
    ).toEqual(["g4", "g3", "g2", "g1", "g0"]);
    expect(
      result.status === "ok" && result.games.map((game) => game.shared)
    ).toEqual([false, true, false, true, false]);
    // Two pages of private games, one of shared games.
    expect(os.listDataByMarker).toHaveBeenCalledTimes(3);
  });
});

describe("loadSharedGame", () => {
  it("opens a shared game", async () => {
    const { putGame, asOs } = fakeRecords();
    putGame(makeGame({ id: "g", name: "Youth group", shared: true }));

    const result = await loadSharedGame("user-1", "g", asOs);

    expect(result).toEqual({
      status: "ok",
      game: makeGame({ id: "g", name: "Youth group", shared: true }),
    });
  });

  it("treats a private, deleted, refused, or unreadable game as no longer shared", async () => {
    const { os, items, putGame, asOs } = fakeRecords();
    putGame(makeGame({ id: "private" }));
    items.set(gameAddress("broken"), {
      data: { id: "broken" },
      markers: [PUBLIC_GAME_MARKER],
    });
    putGame(makeGame({ id: "refused", shared: true }));

    for (const id of ["private", "deleted", "broken"]) {
      await expect(loadSharedGame("user-1", id, asOs)).resolves.toEqual({
        status: "not_shared",
      });
    }
    // The server refuses a private game with `not_authorized` when the reader
    // is signed in, and `not_logged_in` when they aren't.
    for (const errorCode of ["not_authorized", "not_logged_in"]) {
      os.getData.mockResolvedValueOnce({ success: false, errorCode } as never);
      await expect(loadSharedGame("user-1", "refused", asOs)).resolves.toEqual({
        status: "not_shared",
      });
    }
  });

  it("tells a privacy refusal apart from a game that is no longer shared", async () => {
    const { os, putGame, asOs } = fakeRecords();
    putGame(makeGame({ id: "g", shared: true }));
    os.getData.mockResolvedValueOnce(privacyRefusal("allowPublicData"));

    await expect(loadSharedGame("user-1", "g", asOs)).resolves.toEqual({
      status: "privacy_blocked",
    });
  });

  it("reports a server or network failure as an error", async () => {
    const { os, putGame, asOs } = fakeRecords();
    putGame(makeGame({ id: "g", shared: true }));
    os.getData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    } as never);
    await expect(loadSharedGame("user-1", "g", asOs)).resolves.toEqual({
      status: "error",
    });

    os.getData.mockRejectedValueOnce(new Error("offline"));
    await expect(loadSharedGame("user-1", "g", asOs)).resolves.toEqual({
      status: "error",
    });
  });
});

describe("toSavedGame", () => {
  it("reuses the id and creation date when editing", () => {
    const existing = makeGame({
      id: "keep",
      createdAtMs: 50,
      steps: [{ hint: "a" }],
    });
    const saved = toSavedGame(
      {
        name: "  Evening study  ",
        targetVerse: { ...existing.targetVerse, verseNumber: 2 },
        steps: [{ hint: "a" }, { hint: "b" }],
      },
      existing,
      999
    );

    expect(saved.id).toBe("keep");
    expect(saved.createdAtMs).toBe(50);
    expect(saved.name).toBe("Evening study");
    expect(saved.targetVerse.verseNumber).toBe(2);
    expect(saved.steps).toEqual([{ hint: "a" }, { hint: "b" }]);
    expect(saved.steps).not.toBe(existing.steps);
  });

  it("mints a new id for a game that is not an edit", () => {
    const draft = makeGame();
    const saved = toSavedGame(
      { name: draft.name, targetVerse: draft.targetVerse, steps: draft.steps },
      undefined,
      10
    );
    expect(saved.id).not.toBe(draft.id);
    expect(saved.createdAtMs).toBe(10);
  });
});

describe("saved games controller", () => {
  it("stores each game in its own private record", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "old" }));
    await controller.syncUser("user-1");

    await controller.save(draftOf(makeGame({ name: "New" })), null);

    expect(records.os.recordData).toHaveBeenCalledTimes(1);
    const [record, address, data, options] =
      records.os.recordData.mock.calls[0]!;
    const saved = data as SavedGame;
    expect(record).toBe("user-1");
    expect(address).toBe(gameAddress(saved.id));
    expect(saved.name).toBe("New");
    expect(options).toEqual({ marker: PRIVATE_GAME_MARKER });
    expect(PRIVATE_GAME_MARKER.split(":")[0]).toBe("private");
    expect(savedGames.value.map((game) => game.name)).toEqual([
      "New",
      "Youth group",
    ]);
    // The other game's record was never rewritten.
    expect(records.items.get(gameAddress("old"))?.data).toEqual(
      storedData(makeGame({ id: "old" }))
    );
  });

  it("still saves when another record can't be read", async () => {
    const { controller, records, savedGames } = setup();
    const broken = { id: "legacy", games: { not: "a list" } };
    records.put(gameAddress("legacy"), broken);
    await expect(controller.syncUser("user-1")).resolves.toBe("ok");

    await controller.save(draftOf(makeGame({ name: "Fresh" })), null);

    expect(savedGames.value.map((game) => game.name)).toEqual(["Fresh"]);
    expect(records.items.get(gameAddress("legacy"))?.data).toEqual(broken);
  });

  it("keeps the creation date of an edited game, even before the list has loaded", async () => {
    const { controller, records, savedGames } = setup();
    const original = makeGame({ id: "keep", createdAtMs: 50 });
    records.putGame(original);

    await controller.save(
      {
        name: "Kept",
        targetVerse: { ...original.targetVerse, verseNumber: 16 },
        steps: [{ hint: "later" }],
      },
      "keep"
    );

    const stored = records.items.get(gameAddress("keep"))?.data as SavedGame;
    expect(stored.id).toBe("keep");
    expect(stored.createdAtMs).toBe(50);
    expect(stored.targetVerse.verseNumber).toBe(16);
    expect(records.items.size).toBe(1);
    expect(savedGames.value.map((game) => game.id)).toEqual(["keep"]);
  });

  it("replaces an edited game in place in the list", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "a", createdAtMs: 3 }));
    records.putGame(makeGame({ id: "b", createdAtMs: 2 }));
    await controller.syncUser("user-1");

    await controller.save(
      { ...draftOf(makeGame()), steps: [{ hint: "x" }, { hint: "y" }] },
      "b"
    );

    expect(savedGames.value.map((game) => game.id)).toEqual(["a", "b"]);
    expect(savedGames.value[1]?.steps).toHaveLength(2);
  });

  it("refuses to save an edit when the game can't be loaded", async () => {
    const { controller, records } = setup();
    records.os.getData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    } as never);

    await expect(
      controller.save(draftOf(makeGame()), "game-1")
    ).rejects.toMatchObject({ code: "not_loaded" });
    expect(records.os.recordData).not.toHaveBeenCalled();
    expect(
      savedGamesErrorMessage(new SavedGamesWriteError("not_loaded"), "save")
    ).toBe("Couldn't load that game, so nothing was changed.");
  });

  it("puts the list back and reports it when the save does not stick", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "old" }));
    await controller.syncUser("user-1");
    records.os.recordData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    } as never);

    await expect(
      controller.save(draftOf(makeGame({ id: "new" })), null)
    ).rejects.toMatchObject({ code: "persist_failed" });

    expect(savedGames.value.map((game) => game.id)).toEqual(["old"]);
    expect(
      savedGamesErrorMessage(new SavedGamesWriteError("persist_failed"), "save")
    ).toBe("Couldn't save that game. Try again.");
  });

  it("keeps a game private and says why when privacy settings refuse sharing", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "g" }));
    await controller.syncUser("user-1");
    records.os.recordData.mockResolvedValueOnce(privacyRefusal("publishData"));

    const error = await controller
      .setPrivacy("g", true)
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code: "privacy_blocked" });
    expect(savedGamesErrorMessage(error, "save")).toBe(
      "Your account's privacy settings don't allow sharing games."
    );
    expect(savedGames.value.map((game) => game.shared)).toEqual([false]);
    expect(records.items.get(gameAddress("g"))?.markers).toEqual([
      PRIVATE_GAME_MARKER,
    ]);
  });

  it("reports a privacy refusal when an edit would keep a game shared", async () => {
    const { controller, records, savedGames } = setup();
    const shared = makeGame({ id: "g", shared: true });
    records.putGame(shared);
    await controller.syncUser("user-1");
    records.os.recordData.mockResolvedValueOnce(privacyRefusal("publishData"));

    await expect(
      controller.save(draftOf({ ...shared, name: "Renamed" }), "g")
    ).rejects.toMatchObject({ code: "privacy_blocked" });

    expect(records.os.recordData.mock.calls[0]?.[3]).toEqual({
      marker: PUBLIC_GAME_MARKER,
    });
    expect(savedGames.value.map((game) => game.name)).toEqual(["Youth group"]);
    expect(records.items.get(gameAddress("g"))?.data).toEqual(
      storedData(shared)
    );
  });

  it("reports any other refused share as a failed save", async () => {
    const { controller, records } = setup();
    records.putGame(makeGame({ id: "g" }));
    await controller.syncUser("user-1");
    records.os.recordData.mockResolvedValueOnce({
      success: false,
      errorCode: "not_authorized",
    } as never);

    await expect(controller.setPrivacy("g", true)).rejects.toMatchObject({
      code: "persist_failed",
    });
  });

  it("shares one game without opening up any other", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "g", createdAtMs: 2 }));
    records.putGame(makeGame({ id: "other", createdAtMs: 1 }));
    await controller.syncUser("user-1");

    await controller.setPrivacy("g", true);

    expect(records.items.get(gameAddress("g"))).toEqual({
      data: storedData(makeGame({ id: "g", createdAtMs: 2 })),
      markers: [PUBLIC_GAME_MARKER],
    });
    expect(records.items.get(gameAddress("other"))?.markers).toEqual([
      PRIVATE_GAME_MARKER,
    ]);
    expect(savedGames.value.map((game) => [game.id, game.shared])).toEqual([
      ["g", true],
      ["other", false],
    ]);
    await expect(
      loadSharedGame("user-1", "g", records.asOs)
    ).resolves.toMatchObject({ status: "ok" });
    await expect(
      loadSharedGame("user-1", "other", records.asOs)
    ).resolves.toEqual({ status: "not_shared" });
  });

  it("stops sharing a game, so its link stops working", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "g", shared: true }));
    await controller.syncUser("user-1");

    await controller.setPrivacy("g", false);

    expect(records.items.get(gameAddress("g"))?.markers).toEqual([
      PRIVATE_GAME_MARKER,
    ]);
    expect(savedGames.value.map((game) => game.shared)).toEqual([false]);
    await expect(loadSharedGame("user-1", "g", records.asOs)).resolves.toEqual({
      status: "not_shared",
    });
  });

  it("keeps an edited game shared, and its link plays the edit", async () => {
    const { controller, records, savedGames } = setup();
    const shared = makeGame({ id: "g", shared: true });
    records.putGame(shared);
    await controller.syncUser("user-1");

    await controller.save(
      draftOf({ ...shared, name: "Renamed", steps: [{ hint: "new" }] }),
      "g"
    );

    expect(records.items.get(gameAddress("g"))?.markers).toEqual([
      PUBLIC_GAME_MARKER,
    ]);
    expect(savedGames.value.map((game) => game.shared)).toEqual([true]);
    const opened = await loadSharedGame("user-1", "g", records.asOs);
    expect(opened.status === "ok" && opened.game.name).toBe("Renamed");
    expect(opened.status === "ok" && opened.game.steps).toEqual([
      { hint: "new" },
    ]);
  });

  it("does not share when nobody is signed in", async () => {
    const { controller, records } = setup(null);
    records.putGame(makeGame({ id: "g" }));

    await expect(controller.setPrivacy("g", true)).rejects.toMatchObject({
      code: "signed_out",
    });
    expect(records.os.recordData).not.toHaveBeenCalled();
  });

  it("refuses to share a game that is no longer on the server", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "g" }));
    await controller.syncUser("user-1");
    records.items.delete(gameAddress("g"));

    await expect(controller.setPrivacy("g", true)).rejects.toMatchObject({
      code: "not_loaded",
    });
    expect(records.os.recordData).not.toHaveBeenCalled();
    expect(records.items.has(gameAddress("g"))).toBe(false);
    expect(savedGames.value.map((game) => game.shared)).toEqual([false]);
  });

  it("puts the card back when sharing does not stick", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "g" }));
    await controller.syncUser("user-1");
    records.os.recordData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    } as never);

    await expect(controller.setPrivacy("g", true)).rejects.toMatchObject({
      code: "persist_failed",
    });
    expect(savedGames.value.map((game) => game.shared)).toEqual([false]);
    expect(records.items.get(gameAddress("g"))?.markers).toEqual([
      PRIVATE_GAME_MARKER,
    ]);
  });

  it("deletes only that game's record", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "keep", createdAtMs: 2 }));
    records.putGame(makeGame({ id: "drop", createdAtMs: 1 }));
    await controller.syncUser("user-1");

    await controller.remove("drop");

    expect(records.os.eraseData).toHaveBeenCalledWith(
      "user-1",
      gameAddress("drop")
    );
    expect(records.items.has(gameAddress("keep"))).toBe(true);
    expect(savedGames.value.map((game) => game.id)).toEqual(["keep"]);
  });

  it("drops a card when that game was already deleted on the server", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "gone" }));
    await controller.syncUser("user-1");
    records.items.clear();

    await controller.remove("gone");

    expect(savedGames.value).toEqual([]);
  });

  it("puts a deleted game back when the delete does not stick", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "old" }));
    await controller.syncUser("user-1");
    records.os.eraseData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    } as never);

    await expect(controller.remove("old")).rejects.toMatchObject({
      code: "persist_failed",
    });
    expect(savedGames.value.map((game) => game.id)).toEqual(["old"]);
    expect(
      savedGamesErrorMessage(
        new SavedGamesWriteError("persist_failed"),
        "delete"
      )
    ).toBe("Couldn't delete that game. Try again.");
  });

  it("does not write when nobody is signed in", async () => {
    const { controller, records } = setup(null);
    await expect(
      controller.save(draftOf(makeGame()), null)
    ).rejects.toMatchObject({
      code: "signed_out",
    });
    await expect(controller.remove("game-1")).rejects.toMatchObject({
      code: "signed_out",
    });
    expect(records.os.recordData).not.toHaveBeenCalled();
    expect(records.os.eraseData).not.toHaveBeenCalled();
    expect(
      savedGamesErrorMessage(new SavedGamesWriteError("signed_out"), "save")
    ).toBe("Sign in to save games");
  });

  it("does not show another account's games", async () => {
    const { controller, records, savedGames, currentUser } = setup();
    records.putGame(makeGame({ id: "mine" }));
    await controller.syncUser("user-1");
    expect(savedGames.value).toHaveLength(1);

    currentUser.value = "user-2";
    records.items.clear();
    await controller.syncUser("user-2");

    expect(savedGames.value).toEqual([]);
  });

  it("keeps a game that is still being saved when the panel reloads", async () => {
    const { controller, records, savedGames } = setup();
    const listed = deferred<void>();
    const list = records.os.listDataByMarker.getMockImplementation()!;
    records.os.listDataByMarker.mockImplementationOnce(async (...args) => {
      const page = await list(...args);
      await listed.promise;
      return page;
    });
    const write = deferred<void>();
    const record = records.os.recordData.getMockImplementation()!;
    records.os.recordData.mockImplementationOnce(async (...args) => {
      await write.promise;
      return record(...args);
    });

    const saving = controller.save(draftOf(makeGame({ name: "One" })), null);
    await vi.waitFor(() => expect(savedGames.value).toHaveLength(1));
    const syncing = controller.syncUser("user-1");
    // The reload must not blank the card while the save is still writing.
    expect(savedGames.value.map((game) => game.name)).toEqual(["One"]);

    write.resolve();
    listed.resolve();
    await Promise.all([saving, syncing]);

    expect(savedGames.value.map((game) => game.name)).toEqual(["One"]);
  });

  it("lists every game when a save lands while the list is still loading", async () => {
    const { controller, records, savedGames } = setup();
    records.putGame(makeGame({ id: "a", name: "A", createdAtMs: 2 }));
    records.putGame(makeGame({ id: "b", name: "B", createdAtMs: 1 }));
    const listed = deferred<void>();
    const list = records.os.listDataByMarker.getMockImplementation()!;
    records.os.listDataByMarker.mockImplementationOnce(async (...args) => {
      const page = await list(...args);
      await listed.promise;
      return page;
    });

    const syncing = controller.syncUser("user-1");
    await controller.save(
      draftOf(makeGame({ name: "New", createdAtMs: 3 })),
      null
    );
    listed.resolve();

    await expect(syncing).resolves.toBe("ok");
    expect(savedGames.value.map((game) => game.name)).toEqual([
      "New",
      "A",
      "B",
    ]);
  });
});
