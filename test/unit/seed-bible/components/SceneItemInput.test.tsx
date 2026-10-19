import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  SceneItemInput,
  type SceneItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/SceneItemInput/SceneItemInput";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

describe("SceneItemInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const input = () => container.querySelector<HTMLInputElement>("input")!;
  const type = (value: string) =>
    act(() => {
      input().value = value;
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("adds a scene with its trimmed title on Enter and clears", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<SceneItemInput onAdd={onAdd} />, container);
    });
    type("  Scene 1 · Hagar ");
    act(() => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(onAdd).toHaveBeenCalledWith({
      type: "scene",
      title: "Scene 1 · Hagar",
    });
    expect(input().value).toBe("");
  });

  it("is dirty only when the title differs from the scene it started with", () => {
    const handleRef = createRef<SceneItemInputHandle>();
    act(() => {
      render(
        <SceneItemInput
          ref={handleRef}
          onAdd={vi.fn()}
          initialItem={{ title: "Intro" }}
        />,
        container
      );
    });
    expect(input().value).toBe("Intro");
    expect(handleRef.current?.isDirty()).toBe(false);

    type("Introduction");
    expect(handleRef.current?.isDirty()).toBe(true);
    expect(handleRef.current?.commit()).toBe(true);
  });

  it("refuses an empty title", () => {
    const onAdd = vi.fn();
    const handleRef = createRef<SceneItemInputHandle>();
    act(() => {
      render(<SceneItemInput ref={handleRef} onAdd={onAdd} />, container);
    });
    expect(handleRef.current?.commit()).toBe(false);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
