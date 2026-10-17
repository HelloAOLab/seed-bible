import { signal } from "@preact/signals";
import { describe, expect, it, vi } from "vitest";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import {
  createSavedGamesController,
  GAMES_ADDRESS,
  GAMES_MARKER,
  loadGames,
  savedGamesErrorMessage,
  SavedGamesWriteError,
  toSavedGame,
} from "@packages/find-the-verse-extension/ext_FindTheVerse/gamesStore";
import type { SavedGame } from "@packages/find-the-verse-extension/ext_FindTheVerse/types";

function makeGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    id: "game-1",
    createdAtMs: 1_000,
    steps: [{ hint: "" }],
    targetVerse: {
      bookId: "JHN",
      chapterNumber: 1,
      verseNumber: 1,
      verseText: "In the beginning",
    },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup(userId: string | null = "user-1") {
  const savedGames = signal<SavedGame[]>([]);
  const currentUser = signal(userId);
  const os = {
    getData: vi.fn(),
    recordData: vi.fn().mockResolvedValue({ success: true }),
  };
  const controller = createSavedGamesController(
    savedGames,
    () => currentUser.value,
    os as unknown as CasualOSManager
  );
  return { savedGames, currentUser, os, controller };
}

describe("loadGames", () => {
  it("treats a missing record as an empty list and any other failure as an error", async () => {
    const os = {
      getData: vi.fn(),
    } as unknown as CasualOSManager & { getData: ReturnType<typeof vi.fn> };

    os.getData.mockResolvedValueOnce({
      success: false,
      errorCode: "data_not_found",
    });
    await expect(loadGames("user-1", os)).resolves.toEqual({
      status: "ok",
      games: [],
    });

    os.getData.mockResolvedValueOnce({ success: true, data: null });
    await expect(loadGames("user-1", os)).resolves.toEqual({
      status: "ok",
      games: [],
    });

    os.getData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    });
    await expect(loadGames("user-1", os)).resolves.toEqual({
      status: "error",
    });

    os.getData.mockRejectedValueOnce(new Error("offline"));
    await expect(loadGames("user-1", os)).resolves.toEqual({ status: "error" });

    os.getData.mockResolvedValueOnce({
      success: true,
      data: { games: { not: "a list" } },
    });
    await expect(loadGames("user-1", os)).resolves.toEqual({ status: "error" });
  });

  it("drops entries that are not saved games", async () => {
    const os = {
      getData: vi.fn().mockResolvedValue({
        success: true,
        data: {
          games: [
            makeGame(),
            { id: 1 },
            null,
            { ...makeGame({ id: "empty-steps" }), steps: [] },
            { ...makeGame({ id: "null-step" }), steps: [null] },
            {
              ...makeGame({ id: "no-text" }),
              targetVerse: {
                bookId: "JHN",
                chapterNumber: 1,
                verseNumber: 1,
              },
            },
          ],
        },
      }),
    } as unknown as CasualOSManager;

    await expect(loadGames("user-1", os)).resolves.toEqual({
      status: "ok",
      games: [makeGame()],
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
        targetVerse: { ...existing.targetVerse, verseNumber: 2 },
        steps: [{ hint: "a" }, { hint: "b" }],
      },
      existing,
      999
    );

    expect(saved.id).toBe("keep");
    expect(saved.createdAtMs).toBe(50);
    expect(saved.targetVerse.verseNumber).toBe(2);
    expect(saved.steps).toEqual([{ hint: "a" }, { hint: "b" }]);
    expect(saved.steps).not.toBe(existing.steps);
  });

  it("mints a new id for a game that is not an edit", () => {
    const draft = makeGame();
    const saved = toSavedGame(
      { targetVerse: draft.targetVerse, steps: draft.steps },
      undefined,
      10
    );
    expect(saved.id).not.toBe(draft.id);
    expect(saved.createdAtMs).toBe(10);
  });
});

describe("saved games controller", () => {
  it("refuses to write when the load failed, so earlier games stay on the server", async () => {
    const { controller, os, savedGames } = setup();
    os.getData.mockResolvedValue({
      success: false,
      errorCode: "server_error",
    });

    await expect(controller.syncUser("user-1")).resolves.toBe("error");
    await expect(
      controller.save(makeGame({ id: "new" }))
    ).rejects.toMatchObject({ code: "not_loaded" });

    expect(os.recordData).not.toHaveBeenCalled();
    expect(savedGames.value).toEqual([]);
    expect(
      savedGamesErrorMessage(new SavedGamesWriteError("not_loaded"), "save")
    ).toBe("Couldn't load your saved games, so nothing was changed.");
  });

  it("keeps games that were still loading when a new one is saved", async () => {
    const { controller, os, savedGames } = setup();
    const pending = deferred<{
      success: boolean;
      data: { games: SavedGame[] };
    }>();
    os.getData.mockReturnValue(pending.promise);

    const syncing = controller.syncUser("user-1");
    const saving = controller.save(makeGame({ id: "new" }));
    pending.resolve({
      success: true,
      data: { games: [makeGame({ id: "old" })] },
    });

    await Promise.all([syncing, saving]);

    expect(savedGames.value.map((game) => game.id)).toEqual(["new", "old"]);
    expect(os.recordData).toHaveBeenCalledTimes(1);
    expect(os.recordData).toHaveBeenCalledWith(
      "user-1",
      GAMES_ADDRESS,
      {
        games: [
          expect.objectContaining({ id: "new" }),
          expect.objectContaining({ id: "old" }),
        ],
      },
      { marker: GAMES_MARKER }
    );
    expect(GAMES_MARKER).toBe("private");
  });

  it("replaces a game when it is saved again with the same id", async () => {
    const { controller, os, savedGames } = setup();
    const original = makeGame({
      id: "g1",
      steps: [{ hint: "" }, { hint: "" }],
    });
    os.getData.mockResolvedValue({
      success: true,
      data: { games: [original] },
    });
    await controller.syncUser("user-1");

    await controller.save({
      ...original,
      steps: [{ hint: "" }, { hint: "" }, { hint: "x" }],
    });

    expect(savedGames.value).toHaveLength(1);
    expect(savedGames.value[0]?.id).toBe("g1");
    expect(savedGames.value[0]?.steps).toHaveLength(3);
    expect(savedGames.value[0]?.createdAtMs).toBe(original.createdAtMs);
    const written = os.recordData.mock.calls[0]?.[2] as {
      games: SavedGame[];
    };
    expect(written.games).toHaveLength(1);
  });

  it("puts the list back and reports it when the save does not stick", async () => {
    const { controller, os, savedGames } = setup();
    const original = makeGame({ id: "old" });
    os.getData.mockResolvedValue({
      success: true,
      data: { games: [original] },
    });
    await controller.syncUser("user-1");
    os.recordData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    });

    await expect(
      controller.save(makeGame({ id: "new" }))
    ).rejects.toBeInstanceOf(SavedGamesWriteError);

    expect(savedGames.value.map((game) => game.id)).toEqual(["old"]);
    expect(
      savedGamesErrorMessage(new SavedGamesWriteError("persist_failed"), "save")
    ).toBe("Couldn't save that game. Try again.");
  });

  it("puts a deleted game back when the delete does not stick", async () => {
    const { controller, os, savedGames } = setup();
    const original = makeGame({ id: "old" });
    os.getData.mockResolvedValue({
      success: true,
      data: { games: [original] },
    });
    await controller.syncUser("user-1");
    os.recordData.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    });

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
    const { controller, os } = setup(null);
    await expect(controller.save(makeGame())).rejects.toMatchObject({
      code: "signed_out",
    });
    expect(os.recordData).not.toHaveBeenCalled();
    expect(
      savedGamesErrorMessage(new SavedGamesWriteError("signed_out"), "save")
    ).toBe("Sign in to save games");
  });

  it("applies a second save on top of the first instead of dropping it", async () => {
    const { controller, os, savedGames } = setup();
    os.getData.mockResolvedValue({
      success: true,
      data: { games: [makeGame({ id: "old" })] },
    });
    await controller.syncUser("user-1");

    const resolvers: Array<(value: { success: true }) => void> = [];
    os.recordData.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        })
    );

    const first = controller.save(makeGame({ id: "a" }));
    const second = controller.save(makeGame({ id: "b" }));
    await vi.waitFor(() => {
      expect(resolvers).toHaveLength(1);
    });
    resolvers[0]!({ success: true });
    await vi.waitFor(() => {
      expect(resolvers).toHaveLength(2);
    });
    resolvers[1]!({ success: true });
    await Promise.all([first, second]);

    expect(savedGames.value.map((game) => game.id)).toEqual(["b", "a", "old"]);
  });
});
