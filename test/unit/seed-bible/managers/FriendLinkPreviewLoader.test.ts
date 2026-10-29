import {
  createFriendLinkPreviewLoader,
  type FriendLinkSeed,
} from "@packages/seed-bible/seed-bible/managers/FriendLinkPreviewLoader";
import { createLoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";

type GetDataResult = Awaited<ReturnType<CasualOSManager["getData"]>>;

const USER_ID = "35160ebe-fcea-4883-8b6c-7e8ae6035aff";
const OTHER_USER_ID = "0b6f2c1e-7a4d-4e8a-9c1f-2b6d8e0a4c7f";

const PROFILE = {
  name: "Ana",
  pictureUrl: "https://files.example/ana.png",
};

const found = (data: unknown) => ({ success: true, data }) as GetDataResult;

const failed = (errorCode: string) =>
  ({ success: false, errorCode, errorMessage: errorCode }) as GetDataResult;

function createLoader(
  search: string,
  getData: (
    recordName: string,
    address: string
  ) => Promise<GetDataResult> = async () => found(PROFILE),
  initialSeed?: FriendLinkSeed
) {
  const os = CasualOSManager();
  const getDataSpy = vi.spyOn(os, "getData").mockImplementation(getData);
  const loader = createFriendLinkPreviewLoader({
    login: createLoginManager({ os }),
    navigation: { initialUrl: new URL(`http://ssr.local/${search}`) },
    initialSeed,
  });
  return { loader, getDataSpy };
}

describe("createFriendLinkPreviewLoader", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete import.meta.env.SSR;
  });

  describe("without a usable friend link", () => {
    it("settles at once with no result when the URL has no addFriend param", async () => {
      const { loader, getDataSpy } = createLoader("?book=GEN");

      await loader.initialLoadPromise;

      expect(loader.result.value).toBeNull();
      expect(loader.getSeed()).toBeNull();
      expect(getDataSpy).not.toHaveBeenCalled();
    });

    it("settles at once with no result when the addFriend param isn't a user ID", async () => {
      const { loader, getDataSpy } = createLoader("?addFriend=35160ebe-fcea");

      await loader.initialLoadPromise;

      expect(loader.result.value).toBeNull();
      expect(getDataSpy).not.toHaveBeenCalled();
    });
  });

  describe("without a seed", () => {
    it("loads the linked person's profile", async () => {
      const { loader, getDataSpy } = createLoader(`?addFriend=${USER_ID}`);

      await loader.initialLoadPromise;

      expect(getDataSpy).toHaveBeenCalledWith(USER_ID, "profile");
      expect(loader.result.value).toEqual({
        userId: USER_ID,
        profile: { ...PROFILE, config: null },
      });
      expect(loader.getSeed()).toEqual(loader.result.value);
    });

    it("drops the profile's private config so it isn't embedded in the page", async () => {
      const { loader } = createLoader(`?addFriend=${USER_ID}`, async () =>
        found({ ...PROFILE, config: { themeId: "dark", tutorialSeen: true } })
      );

      await loader.initialLoadPromise;

      expect(loader.getSeed()?.profile?.config).toBeNull();
      expect(loader.getSeed()?.profile?.name).toBe("Ana");
    });

    it("records a confirmed missing account as a null profile", async () => {
      const { loader } = createLoader(`?addFriend=${USER_ID}`, async () =>
        failed("record_not_found")
      );

      await loader.initialLoadPromise;

      expect(loader.result.value).toEqual({ userId: USER_ID, profile: null });
      expect(loader.getSeed()).toEqual({ userId: USER_ID, profile: null });
    });

    it("leaves no result or seed when the profile can't be read", async () => {
      const { loader } = createLoader(`?addFriend=${USER_ID}`, async () =>
        failed("server_error")
      );

      await loader.initialLoadPromise;

      expect(loader.result.value).toBeNull();
      expect(loader.getSeed()).toBeNull();
    });

    it("stops waiting after five seconds during SSR and leaves no seed", async () => {
      import.meta.env.SSR = true;
      vi.useFakeTimers();
      const { loader } = createLoader(
        `?addFriend=${USER_ID}`,
        () => new Promise<GetDataResult>(() => {})
      );
      let settled = false;
      void loader.initialLoadPromise.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(4999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(settled).toBe(true);
      expect(loader.getSeed()).toBeNull();
    });
  });

  describe("with a seed", () => {
    it("uses a valid seed for the same person without loading the profile", async () => {
      const { loader, getDataSpy } = createLoader(
        `?addFriend=${USER_ID}`,
        undefined,
        { userId: USER_ID, profile: PROFILE }
      );

      await loader.initialLoadPromise;

      expect(loader.result.value).toEqual({
        userId: USER_ID,
        profile: PROFILE,
      });
      expect(getDataSpy).not.toHaveBeenCalled();
    });

    it("accepts a seed that recorded a missing account", async () => {
      const { loader, getDataSpy } = createLoader(
        `?addFriend=${USER_ID}`,
        undefined,
        { userId: USER_ID, profile: null }
      );

      await loader.initialLoadPromise;

      expect(loader.result.value).toEqual({ userId: USER_ID, profile: null });
      expect(getDataSpy).not.toHaveBeenCalled();
    });

    it("ignores a seed for someone else and loads the linked person's profile", async () => {
      const { loader, getDataSpy } = createLoader(
        `?addFriend=${USER_ID}`,
        undefined,
        { userId: OTHER_USER_ID, profile: { name: "Someone else" } }
      );

      await loader.initialLoadPromise;

      expect(getDataSpy).toHaveBeenCalledWith(USER_ID, "profile");
      expect(loader.result.value?.profile?.name).toBe("Ana");
    });

    it("ignores a malformed seed and loads the profile instead", async () => {
      const { loader, getDataSpy } = createLoader(
        `?addFriend=${USER_ID}`,
        undefined,
        { userId: USER_ID, profile: { name: 123 } } as unknown as FriendLinkSeed
      );

      await loader.initialLoadPromise;

      expect(getDataSpy).toHaveBeenCalledWith(USER_ID, "profile");
      expect(loader.result.value?.profile?.name).toBe("Ana");
    });
  });
});
