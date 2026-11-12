import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { QuestionAnswersSheet } from "@packages/seed-bible/seed-bible/components/QuestionAnswers/QuestionAnswersSheet";
import {
  createPlayingState,
  type SimplePlaylist,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type {
  BibleReadingSession,
  SessionQuestionAnswer,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const QUESTION = {
  type: "html" as const,
  html: "<p>Where have you seen God at work?</p>",
  question: {},
};

const VISUAL = { color: "#3b6fb6", defaultIcon: "pets", colorName: "blue" };

function answer(
  overrides: Partial<SessionQuestionAnswer> = {}
): SessionQuestionAnswer {
  return {
    stepKey: "p1#0",
    authorId: "user-maria",
    text: "In the waiting room.",
    updatedAtMs: 1,
    name: "Maria",
    pictureUrl: null,
    visual: VISUAL,
    ...overrides,
  };
}

/**
 * A session holding answers in memory, sharing as the real one does: one
 * answer per person per question, a blank one taking theirs back.
 */
function fakeSession(initial: SessionQuestionAnswer[] = []) {
  const questionAnswers = signal<readonly SessionQuestionAnswer[]>(initial);
  const session = {
    localSessionId: signal("user-me"),
    questionAnswers,
    setQuestionAnswer: (stepKey: string, text: string) => {
      const others = questionAnswers.value.filter(
        (a) => !(a.stepKey === stepKey && a.authorId === "user-me")
      );
      questionAnswers.value = text.trim()
        ? [
            ...others,
            answer({
              stepKey,
              authorId: "user-me",
              name: "Kal",
              text: text.trim(),
              updatedAtMs: 99,
            }),
          ]
        : others;
    },
  } as unknown as BibleReadingSession;
  return session;
}

describe("QuestionAnswersSheet", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderSheet(
    session: BibleReadingSession,
    items: SimplePlaylist["items"] = [QUESTION]
  ) {
    const playing = createPlayingState([
      { id: "p1", title: "P", description: null, items } as SimplePlaylist,
    ]);
    act(() => {
      render(
        <QuestionAnswersSheet session={session} playing={playing} />,
        container
      );
    });
    return playing;
  }

  const header = () =>
    container.querySelector<HTMLButtonElement>(
      ".sb-scripture-note-sheet-header"
    )!;
  const open = () => act(() => header().click());
  const answerRows = () =>
    Array.from(container.querySelectorAll(".sb-question-answer"), (row) => [
      row.querySelector(".sb-question-answer-name")!.textContent,
      row.querySelector(".sb-question-answer-text")!.textContent,
    ]);

  it("invites the first answer while nobody has answered", () => {
    renderSheet(fakeSession());

    expect(header().textContent).toContain("Answers");
    expect(header().textContent).toContain("Add yours");
    open();
    expect(container.textContent).toContain(
      "No one has answered yet. Be the first."
    );
  });

  it("says how many have answered this question, and lists them when opened", () => {
    renderSheet(
      fakeSession([
        answer(),
        answer({ authorId: "user-daniel", name: "Daniel", text: "Friends." }),
        // Another question's answer doesn't count here.
        answer({ stepKey: "p1#3", authorId: "user-grace", name: "Grace" }),
      ])
    );

    expect(header().textContent).toContain("2 answers");
    expect(
      header().querySelectorAll(
        ".sb-question-answers-avatars .sb-tab-user-icon"
      )
    ).toHaveLength(2);
    expect(container.querySelector(".sb-question-answer")).toBeNull();

    open();
    expect(answerRows()).toEqual([
      ["Maria", "In the waiting room."],
      ["Daniel", "Friends."],
    ]);
  });

  it("shares this participant's answer, then lets them change or remove it", () => {
    renderSheet(fakeSession([answer()]));
    open();
    const box = () => container.querySelector("textarea")!;
    const shareButton = () =>
      container.querySelector<HTMLButtonElement>(".sb-question-answers-share")!;
    expect(shareButton().disabled).toBe(true);

    act(() => {
      box().value = "A neighbour drove me to work.";
      box().dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => shareButton().click());

    expect(answerRows()).toEqual([
      ["Maria", "In the waiting room."],
      ["You", "A neighbour drove me to work."],
    ]);
    expect(box().value).toBe("");
    expect(header().textContent).not.toContain("Add yours");

    // Edit puts it back in the box to change and share again.
    const mine = container.querySelectorAll(".sb-question-answer")[1]!;
    act(() =>
      Array.from(mine.querySelectorAll("button"))
        .find((b) => b.textContent === "Edit")!
        .click()
    );
    expect(box().value).toBe("A neighbour drove me to work.");
    act(() => {
      box().value = "A neighbour, all week.";
      box().dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => shareButton().click());
    expect(answerRows()[1]).toEqual(["You", "A neighbour, all week."]);

    const mineAgain = container.querySelectorAll(".sb-question-answer")[1]!;
    act(() =>
      Array.from(mineAgain.querySelectorAll("button"))
        .find((b) => b.textContent === "Remove")!
        .click()
    );
    expect(answerRows()).toEqual([["Maria", "In the waiting room."]]);
  });

  it("shows other people's answers as plain text, never as markup", () => {
    renderSheet(fakeSession([answer({ text: "<b>bold</b> <img src=x>" })]));
    open();

    const text = container.querySelector(".sb-question-answer-text")!;
    expect(text.textContent).toBe("<b>bold</b> <img src=x>");
    expect(text.querySelector("b, img")).toBeNull();
  });

  it("isn't there on a step that isn't a question", () => {
    renderSheet(fakeSession([answer()]), [
      { type: "html", html: "<p>Just a note</p>" },
    ]);

    expect(container.querySelector(".sb-question-answers")).toBeNull();
  });
});
