import { useSignal } from "@preact/signals";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
import { extractContentText, parseVerseReference } from "seed-bible/managers";
import { useI18n } from "seed-bible/i18n";
import { bookDisplayName, isKnownBookId } from "./books";
import { FormField } from "./FormField";
import { firstEmptyHint } from "./gameLogic";
import type { GameDraft, GameSignals } from "./types";

interface GameCreatorProps {
  game: GameSignals;
  state: SeedBibleState;
  onStart: (draft: GameDraft) => Promise<void>;
  onCancel: () => void;
}

const s = {
  root: {
    padding: "16px",
    color: "var(--sb-font-color, #333)",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "20px",
  },
  heading: {
    fontSize: "1.1rem",
    fontWeight: 600,
    margin: 0,
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    opacity: 0.6,
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid var(--sb-divider-color, rgba(0, 0, 0, 0.12))",
    background: "var(--sb-background, #fff)",
    color: "var(--sb-font-color, #333)",
    fontSize: "0.95rem",
  },
  btn: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  primaryBtn: {
    background: "var(--sb-primary-color, #4a6cf7)",
    color: "var(--sb-primary-font-color, #fff)",
  },
  secondaryBtn: {
    background: "var(--sb-tertiary-color, #f0f0f0)",
    color: "var(--sb-font-color, #333)",
  },
  versePreview: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "var(--sb-tertiary-color, #f0f0f0)",
    fontSize: "0.9rem",
  },
  stepRow: {
    display: "flex" as const,
    gap: "8px",
    alignItems: "flex-start" as const,
  },
  stepNum: {
    minWidth: "24px",
    fontWeight: 600,
    opacity: 0.5,
    fontSize: "0.85rem",
    paddingTop: "8px",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#e63946",
    padding: "4px",
    marginTop: "4px",
    fontSize: "1rem",
    lineHeight: 1,
  },
  hintBox: {
    flex: 1,
    resize: "none" as const,
    overflow: "hidden",
    fontFamily: "inherit",
    lineHeight: 1.4,
  },
  selectingBanner: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "var(--sb-primary-color, #4a6cf7)",
    color: "var(--sb-primary-font-color, #fff)",
    fontSize: "0.9rem",
  },
};

function GrowingHint({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Measure after each render so a new line, and a hint loaded from a saved
  // game, both open the box to the text instead of leaving a one-line field.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight leaves out the border, and the field is border-box, so
    // add that or the last line gets clipped as the box grows.
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + border}px`;
  });

  return (
    <textarea
      ref={ref}
      rows={1}
      style={{ ...s.input, ...s.hintBox }}
      placeholder={placeholder}
      value={value}
      onInput={(event) => onChange((event.target as HTMLTextAreaElement).value)}
    />
  );
}

export function GameCreator({
  game,
  state,
  onStart,
  onCancel,
}: GameCreatorProps) {
  const refInput = useSignal("");
  const refError = useSignal("");
  const saving = useSignal(false);
  const saveAttempted = useSignal(false);
  const chancesDirty = useSignal(false);
  const errorPulse = useSignal(0);
  const { t } = useI18n("find-the-verse-extension");

  const target = game.targetVerse.value;
  const gameName = game.name.value;
  const steps = game.steps.value;
  const selecting = game.selectingViaToolbar.value;
  const signedIn = !!state.login.userId.value;
  const editing = game.currentGameId.value !== null;
  const translationBooks =
    state.app.selectedTab.value?.readingState.translationBooks.value?.books;
  const notice = game.notice.value;

  async function handleRefGo() {
    const unrecognised = t("reference-unrecognised", {
      defaultValue: "Couldn't recognise that reference. Try “John 1:1”.",
    });
    const token = ++game.verseLookup.value;
    const tab = state.app.selectedTab.value;
    const books = tab?.readingState.translationBooks.value?.books;
    const parsed = parseVerseReference(refInput.value, books);
    // An unknown book name comes back as the raw text. Accepting it stores a
    // secret no tap can ever match, because that book has no place in order.
    if (!parsed?.verse || !isKnownBookId(parsed.book)) {
      refError.value = unrecognised;
      errorPulse.value += 1;
      return;
    }

    const translationId = tab?.readingState.translationId.value ?? "BSB";
    const stillCurrent = () =>
      token === game.verseLookup.peek() && game.phase.peek() === "creating";

    try {
      const chapterData = await state.bibleData.getTranslationBookChapter(
        translationId,
        parsed.book,
        parsed.chapter
      );
      if (!stillCurrent()) return;
      const verseNode = chapterData.chapter.content.find(
        (c) => c.type === "verse" && c.number === parsed.verse
      );
      const verseText =
        verseNode && verseNode.type === "verse"
          ? extractContentText(verseNode.content).trim()
          : "";
      if (!verseText) {
        refError.value = unrecognised;
        errorPulse.value += 1;
        return;
      }
      refError.value = "";
      game.targetVerse.value = {
        bookId: parsed.book,
        chapterNumber: parsed.chapter,
        verseNumber: parsed.verse,
        verseText,
      };
      if (tab) {
        void tab.readingState.selectTranslationAndChapter(
          translationId,
          parsed.book,
          parsed.chapter,
          { scrollToVerse: parsed.verse }
        );
      }
    } catch {
      if (!stillCurrent()) return;
      refError.value = unrecognised;
      errorPulse.value += 1;
    }
  }

  function handleStepHintChange(index: number, hint: string) {
    chancesDirty.value = true;
    const updated = [...game.steps.peek()];
    updated[index] = { hint };
    game.steps.value = updated;
  }

  function addStep() {
    chancesDirty.value = true;
    game.steps.value = [...game.steps.peek(), { hint: "" }];
  }

  function removeStep(index: number) {
    chancesDirty.value = true;
    const updated = game.steps.peek().filter((_, i) => i !== index);
    game.steps.value = updated;
  }

  const emptyHint = firstEmptyHint(steps);
  const nameMissing = gameName.trim().length === 0;
  const nameErrorMessage = t("name-required", {
    defaultValue: "Give this game a name.",
  });
  const verseErrorMessage = refError.value
    ? refError.value
    : t("verse-required", {
        defaultValue: "Pick the secret verse before saving.",
      });
  const showChanceError = saveAttempted.value || chancesDirty.value;
  const chanceErrorMessage =
    !showChanceError || emptyHint === null
      ? null
      : t("hint-gap", {
          number: emptyHint + 1,
          defaultValue:
            "Chance {{number}} is empty. Fill it in or delete it before saving.",
        });

  // One field at a time. A name missed on Save wins, then the verse, then a
  // hint gap. Fixing the current one lets the next message take its place.
  let activeError: "name" | "verse" | "chances" | null = null;
  if (saveAttempted.value && nameMissing) activeError = "name";
  else if (refError.value || (saveAttempted.value && target === null)) {
    activeError = "verse";
  } else if (chanceErrorMessage) activeError = "chances";

  const nameError = activeError === "name" ? nameErrorMessage : null;
  const verseError = activeError === "verse" ? verseErrorMessage : null;
  const chanceError = activeError === "chances" ? chanceErrorMessage : null;

  function rejectSave() {
    saveAttempted.value = true;
    errorPulse.value += 1;
  }

  function handleSave() {
    if (saving.value) return;
    const verse = game.targetVerse.peek();
    const name = game.name.peek().trim();
    const gap = firstEmptyHint(game.steps.peek());
    if (!name || !verse || gap !== null) {
      rejectSave();
      return;
    }
    if (!state.login.userId.peek()) {
      game.notice.value = t("sign-in-to-save", {
        defaultValue: "Sign in to save games",
      });
      return;
    }
    refError.value = "";
    saving.value = true;
    void onStart({
      name: game.name.peek(),
      targetVerse: verse,
      steps: game.steps.peek(),
    }).finally(() => {
      saving.value = false;
    });
  }

  return (
    <div style={s.root}>
      <p style={s.heading}>
        {editing
          ? t("edit-game", { defaultValue: "Edit game" })
          : t("create-game", { defaultValue: "Create a game" })}
      </p>

      <FormField error={nameError} pulse={errorPulse.value}>
        <div style={s.label}>
          {t("game-name", { defaultValue: "Game name" })}
          <span aria-hidden="true"> *</span>
        </div>
        <input
          style={s.input}
          type="text"
          required
          aria-required="true"
          placeholder={t("game-name-placeholder", {
            defaultValue: "e.g. Youth group",
          })}
          value={gameName}
          onInput={(event) => {
            game.name.value = (event.target as HTMLInputElement).value;
          }}
        />
      </FormField>

      <FormField error={verseError} pulse={errorPulse.value}>
        <div style={s.label}>
          {t("secret-verse", { defaultValue: "Secret verse" })}
          <span aria-hidden="true"> *</span>
        </div>

        {selecting ? (
          <div style={s.selectingBanner}>
            {t("select-verse-banner", {
              defaultValue:
                "Tap any verse in the reader, then choose Set as target in the toolbar.",
            })}
            <button
              type="button"
              style={{
                ...s.btn,
                ...s.secondaryBtn,
                marginTop: "8px",
                display: "block",
              }}
              onClick={() => {
                game.selectingViaToolbar.value = false;
              }}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
          </div>
        ) : (
          <>
            {target && (
              <div style={{ ...s.versePreview, marginBottom: "8px" }}>
                <strong>
                  {bookDisplayName(target.bookId, translationBooks)}{" "}
                  {target.chapterNumber}:{target.verseNumber}
                </strong>
                {target.verseText && (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontStyle: "italic",
                      opacity: 0.85,
                      fontSize: "0.9rem",
                    }}
                  >
                    &ldquo;{target.verseText}&rdquo;
                  </p>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                style={{ ...s.input, flex: 1 }}
                type="text"
                placeholder={t("reference-placeholder", {
                  defaultValue: "e.g. John 1:1",
                })}
                value={refInput.value}
                onInput={(e) => {
                  refInput.value = (e.target as HTMLInputElement).value;
                  refError.value = "";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRefGo();
                }}
              />
              <button
                type="button"
                style={{ ...s.btn, ...s.primaryBtn }}
                onClick={() => void handleRefGo()}
              >
                {t("go", { defaultValue: "Go" })}
              </button>
            </div>
            <button
              type="button"
              style={{ ...s.btn, ...s.secondaryBtn }}
              onClick={() => {
                game.selectingViaToolbar.value = true;
              }}
            >
              {t("select-from-reader", { defaultValue: "Select from reader…" })}
            </button>
          </>
        )}
      </FormField>

      <FormField error={chanceError} pulse={errorPulse.value}>
        <div style={s.label}>
          {t("chances-label", {
            total: steps.length,
            defaultValue: "Chances ({{total}})",
          })}
        </div>
        <p style={{ margin: "0 0 8px", opacity: 0.6, fontSize: "0.85rem" }}>
          {t("chances-start", {
            defaultValue:
              "Start with 7. Add or remove any. Every chance needs a hint — fill an empty one or delete it before saving.",
          })}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {steps.map((step, i) => (
            <div key={i} style={s.stepRow}>
              <span style={s.stepNum}>#{i + 1}</span>
              <GrowingHint
                placeholder={t("hint-placeholder", {
                  defaultValue: "Optional hint…",
                })}
                value={step.hint}
                onChange={(hint) => handleStepHintChange(i, hint)}
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  style={s.removeBtn}
                  title={t("remove-chance", {
                    defaultValue: "Remove this chance",
                  })}
                  onClick={() => removeStep(i)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          style={{ ...s.btn, ...s.secondaryBtn, marginTop: "8px" }}
          onClick={addStep}
        >
          {t("add-chance", { defaultValue: "+ Add chance" })}
        </button>
      </FormField>

      {notice && (
        <p
          style={{
            margin: 0,
            color: "#e63946",
            fontSize: "0.9rem",
          }}
        >
          {notice}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          style={{
            ...s.btn,
            ...s.primaryBtn,
            flex: 1,
            opacity: saving.value ? 0.45 : 1,
          }}
          disabled={saving.value}
          onClick={handleSave}
        >
          {signedIn
            ? t("save-game", { defaultValue: "Save game" })
            : t("sign-in-to-save", { defaultValue: "Sign in to save games" })}
        </button>
        <button
          type="button"
          style={{ ...s.btn, ...s.secondaryBtn }}
          onClick={onCancel}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
      </div>
    </div>
  );
}
