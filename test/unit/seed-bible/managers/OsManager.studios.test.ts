import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";

describe("CasualOSManager studios", () => {
  let os: ReturnType<typeof CasualOSManager>;

  beforeEach(() => {
    os = CasualOSManager();
  });

  /**
   * Stands in for one of the SDK's procedures. Assigned rather than spied on:
   * the records client is a proxy, so `vi.spyOn` finds no own property to
   * replace.
   */
  const stubProcedure = <TInput>(
    name: string,
    impl: (input: TInput) => unknown
  ) => {
    const fn = vi.fn(async (input: TInput) => impl(input));
    (os.client as unknown as Record<string, unknown>)[name] = fn;
    return fn;
  };

  it("creates a studio and returns its ID", async () => {
    const create = stubProcedure("createStudio", () => ({
      success: true,
      studioId: "studio-1",
    }));

    expect(await os.createStudio("Grace Church")).toEqual({
      success: true,
      studioId: "studio-1",
    });
    expect(create).toHaveBeenCalledWith({ displayName: "Grace Church" });
  });

  it("passes on a refused studio with its error code", async () => {
    stubProcedure("createStudio", () => ({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "No.",
    }));

    expect(await os.createStudio("Grace Church")).toEqual({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "No.",
    });
  });

  it("creates a record owned by a studio rather than a person", async () => {
    const create = stubProcedure("createRecord", () => ({ success: true }));

    await os.createStudioRecord("seedbible-content-1", "studio-1");

    expect(create).toHaveBeenCalledWith({
      recordName: "seedbible-content-1",
      studioId: "studio-1",
    });
  });

  it("lists the user's studios with their role in each", async () => {
    stubProcedure("listStudios", () => ({
      success: true,
      studios: [
        {
          studioId: "studio-1",
          displayName: "Grace Church",
          role: "admin",
          isPrimaryContact: true,
          subscriptionTier: "beta",
          ownerStudioComId: null,
        },
      ],
    }));

    expect(await os.listStudios("user-1")).toEqual({
      success: true,
      studios: [
        { studioId: "studio-1", displayName: "Grace Church", role: "admin" },
      ],
    });
  });

  it("lists members by their display name, falling back to their name", async () => {
    stubProcedure("listStudioMembers", () => ({
      success: true,
      members: [
        {
          userId: "user-1",
          studioId: "studio-1",
          role: "admin",
          isPrimaryContact: true,
          user: { id: "user-1", name: "Ann", displayName: "Pastor Ann" },
        },
        {
          userId: "user-2",
          studioId: "studio-1",
          role: "member",
          isPrimaryContact: false,
          user: { id: "user-2", name: "", email: "bo@example.com" },
        },
      ],
    }));

    expect(await os.listStudioMembers("studio-1")).toEqual({
      success: true,
      members: [
        { userId: "user-1", role: "admin", name: "Pastor Ann", email: null },
        {
          userId: "user-2",
          role: "member",
          name: null,
          email: "bo@example.com",
        },
      ],
    });
  });

  it("adds a member by email with a role, and removes one by ID", async () => {
    const add = stubProcedure("addStudioMember", () => ({ success: true }));
    const remove = stubProcedure("removeStudioMember", () => ({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "No.",
    }));

    expect(
      await os.addStudioMember("studio-1", "bo@example.com", "member")
    ).toEqual({ success: true });
    expect(await os.removeStudioMember("studio-1", "user-2")).toEqual({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "No.",
    });
    expect(add).toHaveBeenCalledWith({
      studioId: "studio-1",
      addedEmail: "bo@example.com",
      role: "member",
    });
    expect(remove).toHaveBeenCalledWith({
      studioId: "studio-1",
      removedUserId: "user-2",
    });
  });
});
