import { SubscribedUsersProvider } from "../../../../../../packages/today-screen/infrastructure/adapters/subscriptions/SubscribedUsersProvider";

// The fake user/event generation was removed (branch: fix/remove-today-fake-data).
// `SubscribedUsersProvider` is now an empty stub: no subscribed users, no
// profiles, and no reading-history events. These tests pin that behaviour so
// the stub stays inert until a real implementation replaces it.
describe("SubscribedUsersProvider", () => {
  describe("getUsersIds", () => {
    it("returns an empty list", () => {
      const provider = new SubscribedUsersProvider();
      expect(provider.getUsersIds()).toEqual([]);
    });
  });

  describe("getUserProfile", () => {
    it("returns undefined for any user", () => {
      const provider = new SubscribedUsersProvider();
      expect(provider.getUserProfile("anyone")).toBeUndefined();
    });
  });

  describe("getReadingHistoryEvents", () => {
    it("returns an empty iterable", async () => {
      const provider = new SubscribedUsersProvider();
      expect([...(await provider.getReadingHistoryEvents())]).toEqual([]);
    });
  });
});
