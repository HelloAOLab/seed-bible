import {
  createLoginManager,
  userProfileSchema,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";

jest.setTimeout(3000);

function createBot(id: string): Bot {
  return {
    id,
    link: `bot://${id}`,
    tags: {},
    masks: {},
    links: {},
    vars: {},
    raw: {},
    changes: {},
    maskChanges: {},
  };
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("createLoginManager", () => {
  let requestAuthBotInBackgroundMock: jest.Mock;
  let requestAuthBotMock: jest.Mock;
  let getDataMock: jest.Mock;
  let recordDataMock: jest.Mock;
  let signOutMock: jest.Mock;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    requestAuthBotInBackgroundMock = jest.fn().mockResolvedValue(null);
    requestAuthBotMock = jest.fn().mockResolvedValue(null);
    getDataMock = jest.fn().mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "No data found for the given key.",
    });
    recordDataMock = jest.fn().mockResolvedValue(undefined);
    signOutMock = jest.fn().mockResolvedValue(undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    (globalThis as any).os = {
      ...(globalThis as any).os,
      requestAuthBotInBackground: requestAuthBotInBackgroundMock,
      requestAuthBot: requestAuthBotMock,
      getData: getDataMock,
      recordData: recordDataMock,
      signOut: signOutMock,
    };
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("requests the auth bot in the background on init", () => {
    createLoginManager();

    expect(requestAuthBotInBackgroundMock).toHaveBeenCalledTimes(1);
  });

  it("loads userId and profile when background auth succeeds", async () => {
    const bot = createBot("user-1");
    requestAuthBotInBackgroundMock.mockResolvedValue(bot);
    getDataMock.mockResolvedValue({ success: true, data: { name: "Alice" } });

    const manager = createLoginManager();

    await waitFor(() => manager.userId.value === "user-1");
    await waitFor(() => manager.profile.value?.name === "Alice");

    expect(getDataMock).toHaveBeenCalledWith("user-1", "profile");
  });

  it("login() authenticates and loads profile", async () => {
    const bot = createBot("user-2");
    requestAuthBotMock.mockResolvedValue(bot);
    getDataMock.mockResolvedValue({ success: true, data: { name: "Bob" } });

    const manager = createLoginManager();

    await manager.login();

    await waitFor(() => manager.userId.value === "user-2");
    await waitFor(() => manager.profile.value?.name === "Bob");

    expect(requestAuthBotMock).toHaveBeenCalledTimes(1);
    expect(getDataMock).toHaveBeenCalledWith("user-2", "profile");
  });

  it("logout() signs out and clears user state", async () => {
    const bot = createBot("user-3");
    requestAuthBotInBackgroundMock.mockResolvedValue(bot);
    getDataMock.mockResolvedValue({ success: true, data: { name: "Carol" } });

    const manager = createLoginManager();

    await waitFor(() => manager.userId.value === "user-3");
    await waitFor(() => manager.profile.value?.name === "Carol");

    await manager.logout();

    await waitFor(() => manager.userId.value === null);
    await waitFor(() => manager.profile.value === null);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("updateProfile() persists profile when authenticated", async () => {
    const bot = createBot("user-4");
    requestAuthBotInBackgroundMock.mockResolvedValue(bot);

    const manager = createLoginManager();

    await waitFor(() => manager.userId.value === "user-4");

    manager.updateProfile({ name: "Updated" });

    expect(manager.profile.value).toEqual({ name: "Updated" });
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-4",
      "profile",
      { name: "Updated" },
      { marker: "publicRead" }
    );
  });

  it("updateProfile() does not persist when unauthenticated", () => {
    const manager = createLoginManager();

    manager.updateProfile({ name: "Ignored" });

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Cannot update profile: no authenticated user"
    );
  });

  it("calls posthog.identify() with the user ID when the user logs in", async () => {
    const mockIdentify = jest.fn();
    (globalThis as any).posthog = { identify: mockIdentify };

    try {
      const bot = createBot("user-posthog");
      requestAuthBotMock.mockResolvedValue(bot);

      const manager = createLoginManager();
      await manager.login();

      await waitFor(() => manager.userId.value === "user-posthog");

      expect(mockIdentify).toHaveBeenCalledTimes(1);
      expect(mockIdentify).toHaveBeenCalledWith("user-posthog");
    } finally {
      delete (globalThis as any).posthog;
    }
  });

  it("getUserProfile() retrieves the user profile from storage", async () => {
    getDataMock.mockResolvedValue({ success: true, data: { name: "Dave" } });

    const manager = createLoginManager();

    const profile = await manager.getUserProfile("custom-user");

    expect(getDataMock).toHaveBeenCalledWith("custom-user", "profile");
    expect(profile).toEqual({ name: "Dave" });
  });
});

describe("userProfileSchema", () => {
  it("validates a profile with only a name", () => {
    const validProfile = {
      name: "Alice",
    };

    const result = userProfileSchema.safeParse(validProfile);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Alice",
      },
    });
  });

  it("validates a profile without a pictureUrl", () => {
    const validProfile = {
      name: "Alice",
      location: "Wonderland",
    };

    const result = userProfileSchema.safeParse(validProfile);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Alice",
        location: "Wonderland",
      },
    });
  });

  it("validates a complete profile", () => {
    const validProfile = {
      name: "Alice",
      location: "Wonderland",
      pictureUrl: "https://example.com/avatar.png",
    };

    const result = userProfileSchema.safeParse(validProfile);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Alice",
        location: "Wonderland",
        pictureUrl: "https://example.com/avatar.png",
      },
    });
  });
});
