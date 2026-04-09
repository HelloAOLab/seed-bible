import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";

let manager: ModalManager;

const t = () => "T";

beforeEach(() => {
  manager = createModalManager();
});

describe("createModalManager", () => {
  it("starts with no modals", () => {
    expect(manager.modals.value).toEqual([]);
  });
});

describe("openModal", () => {
  it("adds a modal and returns its id", () => {
    const id = manager.openModal({ title: "Test", content: "hello" });

    expect(id).toBeTruthy();
    expect(manager.modals.value).toHaveLength(1);
    expect(manager.modals.value[0]?.id).toBe(id);
    expect(manager.modals.value[0]?.title).toBe("Test");
  });

  it("uses the provided id when given", () => {
    const id = manager.openModal({ id: "my-modal", title: "T", content: "" });

    expect(id).toBe("my-modal");
    expect(manager.modals.value[0]?.id).toBe("my-modal");
  });

  it("auto-generates unique ids for successive calls", () => {
    const id1 = manager.openModal({ title: "A", content: "" });
    const id2 = manager.openModal({ title: "B", content: "" });

    expect(id1).not.toBe(id2);
  });

  it("replaces an existing modal with the same id (upsert)", () => {
    manager.openModal({ id: "dup", title: "First", content: "first" });
    manager.openModal({ id: "dup", title: "Second", content: "second" });

    const all = manager.modals.value;
    expect(all).toHaveLength(1);
    expect(all[0]?.title).toBe("Second");
  });

  it("preserves other modals when upserting", () => {
    manager.openModal({ id: "a", title: "A", content: "" });
    manager.openModal({ id: "b", title: "B", content: "" });
    manager.openModal({ id: "a", title: "A v2", content: "" });

    const all = manager.modals.value;
    expect(all).toHaveLength(2);
    expect(all.find((m) => m.id === "b")).toBeDefined();
  });

  it("wraps non-function content in a renderer", () => {
    manager.openModal({ title: "T", content: "plain content" });

    const renderer = manager.modals.value[0]?.content;
    expect(typeof renderer).toBe("function");
    expect(renderer?.({ t })).toBe("plain content");
  });

  it("stores function content as-is", () => {
    const contentFn = () => "dynamic";
    manager.openModal({ title: "T", content: contentFn });

    const renderer = manager.modals.value[0]?.content;
    expect(renderer?.({ t })).toBe("dynamic");
  });

  it("adds multiple modals in insertion order", () => {
    manager.openModal({ id: "x", title: "X", content: "" });
    manager.openModal({ id: "y", title: "Y", content: "" });
    manager.openModal({ id: "z", title: "Z", content: "" });

    const ids = manager.modals.value.map((m) => m.id);
    expect(ids).toEqual(["x", "y", "z"]);
  });
});

describe("closeModal", () => {
  it("removes the modal with the given id", () => {
    manager.openModal({ id: "del", title: "T", content: "" });
    manager.closeModal("del");

    expect(manager.modals.value).toHaveLength(0);
  });

  it("does not remove other modals", () => {
    manager.openModal({ id: "keep", title: "Keep", content: "" });
    manager.openModal({ id: "remove", title: "Remove", content: "" });
    manager.closeModal("remove");

    const all = manager.modals.value;
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe("keep");
  });

  it("is a no-op for an unknown id", () => {
    manager.openModal({ id: "a", title: "A", content: "" });
    manager.closeModal("nonexistent");

    expect(manager.modals.value).toHaveLength(1);
  });
});

describe("closeAllModals", () => {
  it("removes all open modals", () => {
    manager.openModal({ title: "A", content: "" });
    manager.openModal({ title: "B", content: "" });
    manager.openModal({ title: "C", content: "" });

    manager.closeAllModals();

    expect(manager.modals.value).toHaveLength(0);
  });

  it("is a no-op when there are no modals", () => {
    manager.closeAllModals();

    expect(manager.modals.value).toHaveLength(0);
  });
});
