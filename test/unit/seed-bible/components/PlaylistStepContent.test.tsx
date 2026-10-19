import { render } from "preact";
import { act } from "preact/test-utils";
import {
  CompareStepContent,
  QuestionStepContent,
} from "@packages/seed-bible/seed-bible/components/PlaylistStepContent/PlaylistStepContent";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const chapterWith = (text: string) =>
  ({
    chapter: {
      number: 1,
      footnotes: [],
      content: [{ type: "verse", number: 1, content: [text] }],
    },
  }) as unknown as TranslationBookChapter;

describe("QuestionStepContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const question = {
    type: "question" as const,
    prompt: "God himself, or a messenger?",
    shareable: true,
  };
  const textarea = () =>
    container.querySelector<HTMLTextAreaElement>(
      ".sb-step-question-response-input"
    )!;
  const saveButton = () =>
    container.querySelector<HTMLButtonElement>(".sb-settings-save-button")!;
  const type = (text: string) =>
    act(() => {
      textarea().value = text;
      textarea().dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("shows who asks and the question, and saves the reader's answer", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    act(() => {
      render(
        <QuestionStepContent
          item={question}
          authorName="Craig"
          onSave={onSave}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-step-question-asks")?.textContent).toBe(
      "Craig asks"
    );
    expect(
      container.querySelector(".sb-step-question-prompt")?.textContent
    ).toBe("God himself, or a messenger?");
    expect(saveButton().disabled).toBe(true);
    // Not in a session: nothing to share with.
    expect(container.querySelector(".sb-step-question-visibility")).toBeNull();

    type("She names him 'a God who sees'.");
    expect(saveButton().disabled).toBe(false);
    await act(async () => {
      saveButton().click();
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith(
      "She names him 'a God who sees'.",
      "private"
    );
    expect(container.textContent).toContain("Saved to your profile.");
  });

  it("offers sharing with the session when the author allows and the reader is in one", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    act(() => {
      render(
        <QuestionStepContent item={question} inSession onSave={onSave} />,
        container
      );
    });

    const choices = container.querySelectorAll<HTMLInputElement>(
      '.sb-step-question-visibility input[type="radio"]'
    );
    expect(choices).toHaveLength(2);
    type("An answer");
    act(() => {
      choices[1]!.checked = true;
      choices[1]!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      saveButton().click();
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith("An answer", "session");
  });

  it("keeps a shareable question private when the author didn't allow sharing", () => {
    act(() => {
      render(
        <QuestionStepContent
          item={{ ...question, shareable: false }}
          inSession
          onSave={vi.fn()}
        />,
        container
      );
    });
    expect(container.querySelector(".sb-step-question-visibility")).toBeNull();
  });

  it("starts from the reader's earlier answer and says when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("offline"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => {
      render(
        <QuestionStepContent
          item={question}
          initialResponse={{ text: "Earlier thought", visibility: "private" }}
          onSave={onSave}
        />,
        container
      );
    });

    expect(textarea().value).toBe("Earlier thought");
    expect(saveButton().disabled).toBe(true);

    type("A new thought");
    await act(async () => {
      saveButton().click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Couldn't save your response.");
    errorSpy.mockRestore();
  });

  it("has no save button when answers can't be kept", () => {
    act(() => {
      render(<QuestionStepContent item={question} />, container);
    });
    expect(container.querySelector(".sb-settings-save-button")).toBeNull();
  });
});

describe("CompareStepContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const resolveBookName = (id: string) =>
    ({ GEN: "Genesis", EXO: "Exodus" })[id] ?? id;

  it("shows each passage in its own column under its reference, with the framing line above", async () => {
    const loadChapter = vi.fn(async (_t: unknown, bookId: string) =>
      chapterWith(bookId === "GEN" ? "Hagar's verse" : "Moses' verse")
    );
    const onOpenPassage = vi.fn();
    act(() => {
      render(
        <CompareStepContent
          item={{
            type: "compare",
            refs: [
              { bookId: "GEN", chapter: 16 },
              { bookId: "EXO", chapter: 3 },
            ],
            description: "Who does each person think they met?",
          }}
          loadChapter={loadChapter}
          resolveBookName={resolveBookName}
          onOpenPassage={onOpenPassage}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-step-compare-description")?.textContent
    ).toBe("Who does each person think they met?");
    const headings = Array.from(
      container.querySelectorAll(".sb-step-compare-heading")
    ).map((el) => el.textContent);
    expect(headings).toEqual(["Genesis 16", "Exodus 3"]);
    await vi.waitFor(() => {
      const passages = Array.from(
        container.querySelectorAll(".sb-step-compare-passage")
      ).map((el) => el.textContent);
      expect(passages[0]).toContain("Hagar's verse");
      expect(passages[1]).toContain("Moses' verse");
    });

    act(() => {
      container
        .querySelectorAll<HTMLButtonElement>(".sb-step-compare-open")[1]
        ?.click();
    });
    expect(onOpenPassage).toHaveBeenCalledWith({ bookId: "EXO", chapter: 3 });
  });

  it("has no open buttons without a reader to open passages in", () => {
    act(() => {
      render(
        <CompareStepContent
          item={{
            type: "compare",
            refs: [
              { bookId: "GEN", chapter: 1 },
              { bookId: "EXO", chapter: 1 },
            ],
          }}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });
    expect(container.querySelector(".sb-step-compare-open")).toBeNull();
    expect(container.querySelector(".sb-step-compare-description")).toBeNull();
  });
});
