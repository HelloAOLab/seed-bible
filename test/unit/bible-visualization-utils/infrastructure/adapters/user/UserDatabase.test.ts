import { UserDatabase } from "bibleVizUtils.infrastructure.adapters.user.UserDatabase";

describe("getSubscribedUsers", () => {
  it("returns a promise", () => {
    const result = new UserDatabase().getSubscribedUsers();
    expect(result).toBeInstanceOf(Promise);
  });

  it("resolves to an array", async () => {
    const result = await new UserDatabase().getSubscribedUsers();
    expect(Array.isArray(result)).toBe(true);
  });

  it("resolves to an empty array", async () => {
    await expect(new UserDatabase().getSubscribedUsers()).resolves.toEqual([]);
  });

  it("resolves independently for each call — no shared state", async () => {
    const db = new UserDatabase();
    const [a, b] = await Promise.all([
      db.getSubscribedUsers(),
      db.getSubscribedUsers(),
    ]);
    expect(a).toEqual([]);
    expect(b).toEqual([]);
  });
});
