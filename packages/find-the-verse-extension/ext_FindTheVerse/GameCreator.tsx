import { useSignal } from "@preact/signals";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
import { extractContentText, parseVerseReference } from "seed-bible/managers";
import { useI18n } from "seed-bible/i18n";
import { formatReference, isKnownBookId } from "./books";
import { FormField } from "./FormField";
import { countFilledHints } from "./gameLogic";
import { MIN_HINTS } from "./gameSession";
import type { GameDraft, GameSignals } from "./types";

interface GameCreatorProps {
  game: GameSignals;
  state: SeedBibleState;
  onPlay: (draft: GameDraft) => void;
  /** Saves the draft. Resolves false when this editor is no longer current. */
  onStart: (draft: GameDraft) => Promise<boolean>;
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

  // Grow with the text. Height lives on the DOM node, so it only needs to be
  // measured when the value changes, including a hint loaded from a saved game.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight leaves out the border, and the field is border-box, so
    // add that or the last line gets clipped as the box grows.
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + border}px`;
  }, [value]);

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
  onPlay,
  onStart,
  onCancel,
}: GameCreatorProps) {
  const refInput = useSignal("");
  const refError = useSignal("");
  const saving = useSignal(false);
  const saveAttempted = useSignal(false);
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
    if (
      parsed &&
      (parsed.endVerse != null || parsed.endChapter != null) &&
      (parsed.endVerse !== parsed.verse || parsed.endChapter !== parsed.chapter)
    ) {
      refError.value = t("reference-range", {
        defaultValue: "Pick a single verse, like John 1:1, not a range.",
      });
      errorPulse.value += 1;
      return;
    }
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
    const updated = [...game.steps.peek()];
    updated[index] = { hint };
    game.steps.value = updated;
  }

  function addStep() {
    game.steps.value = [...game.steps.peek(), { hint: "" }];
  }

  function removeStep(index: number) {
    const current = game.steps.peek();
    if (current.length <= MIN_HINTS) return;
    game.steps.value = current.filter((_, i) => i !== index);
  }

  const nameMissing = gameName.trim().length === 0;
  const nameErrorMessage = t("name-required", {
    defaultValue: "Give this game a name.",
  });
  const verseErrorMessage = refError.value
    ? refError.value
    : t("verse-required", {
        defaultValue: "Pick the secret verse before saving.",
      });

  const hintsShort = countFilledHints(steps) < MIN_HINTS;
  const hintErrorMessage = t("hints-needed", {
    defaultValue: "At least 3 hints are needed.",
  });

  // One field at a time. A name missed on Save or Start wins, then the verse,
  // then too few hints. Fixing the current one lets the next message take its place.
  let activeError: "name" | "verse" | "chances" | null = null;
  if (saveAttempted.value && nameMissing) activeError = "name";
  else if (refError.value || (saveAttempted.value && target === null)) {
    activeError = "verse";
  } else if (saveAttempted.value && hintsShort) activeError = "chances";

  const nameError = activeError === "name" ? nameErrorMessage : null;
  const verseError = activeError === "verse" ? verseErrorMessage : null;
  const chanceError = activeError === "chances" ? hintErrorMessage : null;

  function rejectSave() {
    saveAttempted.value = true;
    errorPulse.value += 1;
  }

  function readyDraft(): GameDraft | null {
    const verse = game.targetVerse.peek();
    const name = game.name.peek().trim();
    if (
      !name ||
      !verse ||
      game.steps.peek().length < MIN_HINTS ||
      countFilledHints(game.steps.peek()) < MIN_HINTS
    ) {
      rejectSave();
      return null;
    }
    return {
      name,
      targetVerse: verse,
      steps: game.steps.peek(),
    };
  }

  async function handlePlay() {
    const draft = readyDraft();
    if (!draft || saving.value) return;
    refError.value = "";
    // A new game can be played without an account. An edit has to be written
    // first, or Start would leave the saved copy on the old verse and hints.
    if (game.currentGameId.peek() === null) {
      onPlay(draft);
      return;
    }
    if (!state.login.userId.peek()) {
      game.notice.value = t("sign-in-to-save", {
        defaultValue: "Sign in to save games",
      });
      return;
    }
    saving.value = true;
    try {
      const stillEditing = await onStart(draft);
      if (stillEditing) onPlay(draft);
    } catch {
      // The save already reported why it failed. Stay on the editor.
    } finally {
      saving.value = false;
    }
  }

  function handleSave() {
    if (saving.value) return;
    const draft = readyDraft();
    if (!draft) return;
    if (!state.login.userId.peek()) {
      game.notice.value = t("sign-in-to-save", {
        defaultValue: "Sign in to save games",
      });
      return;
    }
    refError.value = "";
    saving.value = true;
    void onStart(draft)
      .then((stillEditing) => {
        if (stillEditing) onCancel();
      })
      .catch(() => undefined)
      .finally(() => {
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
                  {formatReference(
                    target.bookId,
                    target.chapterNumber,
                    target.verseNumber,
                    translationBooks
                  )}
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
              "Start with 7. You can add more or remove down to 3. At least 3 hints are needed.",
          })}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {steps.map((step, i) => (
            <div key={i} style={s.stepRow}>
              <span style={s.stepNum}>#{i + 1}</span>
              <GrowingHint
                placeholder={t("hint-placeholder", {
                  defaultValue: "Hint…",
                })}
                value={step.hint}
                onChange={(hint) => handleStepHintChange(i, hint)}
              />
              {steps.length > MIN_HINTS && (
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
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          style={{
            ...s.btn,
            ...s.primaryBtn,
            flex: "1 1 8rem",
            opacity: saving.value ? 0.45 : 1,
          }}
          disabled={saving.value}
          onClick={() => void handlePlay()}
        >
          {editing
            ? t("save-and-start", { defaultValue: "Save & Start" })
            : t("start-game", { defaultValue: "Start game" })}
        </button>
        <button
          type="button"
          style={{
            ...s.btn,
            ...s.secondaryBtn,
            flex: "1 1 8rem",
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
