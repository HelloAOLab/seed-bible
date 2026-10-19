import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  QuestionItemInput,
  type QuestionItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/QuestionItemInput/QuestionItemInput";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function setValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("QuestionItemInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const prompt = () =>
    container.querySelector<HTMLTextAreaElement>(".sb-question-prompt-input")!;
  const title = () =>
    container.querySelector<HTMLInputElement>(".sb-playlist-add-title-input")!;
  const shareable = () =>
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  const submit = () =>
    container.querySelector<HTMLButtonElement>(".sb-settings-save-button")!;

  it("adds a question with its prompt, optional title and sharing choice, then clears", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<QuestionItemInput onAdd={onAdd} />, container);
    });
    expect(submit().disabled).toBe(true);

    act(() => {
      setValue(title(), " Craig asks ");
      setValue(prompt(), " God himself, or a messenger? ");
      shareable().checked = false;
      shareable().dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(submit().disabled).toBe(false);
    act(() => submit().click());

    expect(onAdd).toHaveBeenCalledWith({
      type: "question",
      title: "Craig asks",
      prompt: "God himself, or a messenger?",
      shareable: false,
    });
    expect(prompt().value).toBe("");
    expect(title().value).toBe("");
    expect(shareable().checked).toBe(true);
  });

  it("leaves the title out when blank", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<QuestionItemInput onAdd={onAdd} />, container);
    });
    act(() => setValue(prompt(), "Why?"));
    act(() => submit().click());

    expect(onAdd).toHaveBeenCalledWith({
      type: "question",
      title: undefined,
      prompt: "Why?",
      shareable: true,
    });
  });

  it("seeds from an existing question and is dirty only once something changes", () => {
    const handleRef = createRef<QuestionItemInputHandle>();
    act(() => {
      render(
        <QuestionItemInput
          ref={handleRef}
          onAdd={vi.fn()}
          initialItem={{ prompt: "Why?", title: "Think", shareable: false }}
          submitLabel="Save changes"
        />,
        container
      );
    });

    expect(prompt().value).toBe("Why?");
    expect(title().value).toBe("Think");
    expect(shareable().checked).toBe(false);
    expect(submit().textContent).toBe("Save changes");
    expect(handleRef.current?.isDirty()).toBe(false);

    act(() => setValue(prompt(), "Why not?"));
    expect(handleRef.current?.isDirty()).toBe(true);
  });

  it("commit() refuses an empty prompt", () => {
    const onAdd = vi.fn();
    const handleRef = createRef<QuestionItemInputHandle>();
    act(() => {
      render(<QuestionItemInput ref={handleRef} onAdd={onAdd} />, container);
    });

    let result: boolean | undefined;
    act(() => {
      result = handleRef.current?.commit();
    });

    expect(result).toBe(false);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
