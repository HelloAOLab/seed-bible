import { render } from "preact";
import { act } from "preact/test-utils";
import { EmptyState } from "@packages/seed-bible/seed-bible/components/EmptyState/EmptyState";

describe("EmptyState", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  const show = (node: preact.ComponentChild) =>
    act(() => render(node, container));
  const root = () => container.firstElementChild as HTMLElement;

  it("shows a plain sentence as an inline note", () => {
    show(<EmptyState>No bookmarks yet.</EmptyState>);

    expect(root().textContent).toBe("No bookmarks yet.");
    expect(root().classList).toContain("sb-empty-state-inline");
    expect(root().querySelector(".sb-empty-state-title")).toBeNull();
    expect(root().querySelector(".sb-empty-state-icon")).toBeNull();
    expect(root().querySelector(".sb-empty-state-action")).toBeNull();
  });

  it("shows an icon, a title, a hint and an action in order for a panel", () => {
    show(
      <EmptyState
        size="panel"
        icon="bookmark"
        title="No bookmarks"
        action={<button>Add one</button>}
      >
        Tap the bookmark on any chapter.
      </EmptyState>
    );

    expect(root().classList).toContain("sb-empty-state-panel");
    expect(
      [...root().children].map((child) => child.className.split(" ")[0])
    ).toEqual([
      "sb-empty-state-icon",
      "sb-empty-state-title",
      "sb-empty-state-hint",
      "sb-empty-state-action",
    ]);
    expect(root().textContent).toContain("No bookmarks");
    expect(root().textContent).toContain("Tap the bookmark on any chapter.");
    expect(root().querySelector("button")?.textContent).toBe("Add one");
  });

  it("hides the icon from screen readers, whether it is a symbol name or an element", () => {
    show(<EmptyState icon="inbox">Nothing here.</EmptyState>);
    const symbol = root().querySelector(".sb-empty-state-icon")!;
    expect(symbol.getAttribute("aria-hidden")).toBe("true");
    expect(
      symbol.querySelector(".material-symbols-outlined")?.textContent
    ).toBe("inbox");

    show(<EmptyState icon={<svg class="my-icon" />}>Nothing here.</EmptyState>);
    const wrapper = root().querySelector(".sb-empty-state-icon")!;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper.querySelector(".my-icon")).not.toBeNull();
  });

  it("leaves out the parts it was not given", () => {
    show(<EmptyState title="Nothing here" />);

    expect(root().querySelector(".sb-empty-state-hint")).toBeNull();
    expect(root().querySelector(".sb-empty-state-action")).toBeNull();
    expect(root().querySelector(".sb-empty-state-icon")).toBeNull();
  });

  it("keeps the caller's classes and passes attributes through", () => {
    show(
      <EmptyState className="sb-x" class="sb-y" role="status" id="empty">
        No results.
      </EmptyState>
    );

    expect(root().classList).toContain("sb-x");
    expect(root().classList).toContain("sb-y");
    expect(root().getAttribute("role")).toBe("status");
    expect(root().id).toBe("empty");
  });

  it("lets a link sit inside the sentence", () => {
    const onCreate = vi.fn();
    show(
      <EmptyState>
        You don't have any notes.{" "}
        <button onClick={onCreate}>Create a note</button>
      </EmptyState>
    );

    act(() => root().querySelector("button")!.click());

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(root().textContent).toBe("You don't have any notes. Create a note");
  });
});
