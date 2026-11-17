import { useSignal } from "@preact/signals";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
import { extractContentText, parseVerseReference } from "seed-bible/managers";
import { Button, IconButton } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { formatReference, isKnownBookId } from "./books";
import { FormField } from "./FormField";
import { countFilledHints, emptyHintIndexes } from "./gameLogic";
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

function GrowingHint({
  value,
  placeholder,
  invalid,
  onChange,
}: {
  value: string;
  placeholder: string;
  invalid: boolean;
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
      className={`ftv-input ftv-hint-box${invalid ? " ftv-input--invalid" : ""}`}
      aria-invalid={invalid ? "true" : "false"}
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

    const translationId =
      tab?.readingState.translationId.value ??
      state.tabs.preferredTranslationId();
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
        translationId,
      };
      // A shared session would show everyone in it the secret verse.
      if (tab && !tab.sharedSession) {
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

  const emptyHints = emptyHintIndexes(steps);
  const hintsShort = countFilledHints(steps) < MIN_HINTS;
  const hintErrorMessage = t("hints-needed", {
    defaultValue: "Fill in at least 3 hints.",
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
    if (!name || !verse || countFilledHints(game.steps.peek()) < MIN_HINTS) {
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
    <div className="ftv-creator">
      <p className="ftv-creator-heading">
        {editing
          ? t("edit-game", { defaultValue: "Edit game" })
          : t("create-game", { defaultValue: "Create a game" })}
      </p>

      <FormField error={nameError} pulse={errorPulse.value}>
        <div className="ftv-label">
          {t("game-name", { defaultValue: "Game name" })}
          <span aria-hidden="true"> *</span>
        </div>
        <input
          className="ftv-input"
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
        <div className="ftv-label">
          {t("secret-verse", { defaultValue: "Secret verse" })}
          <span aria-hidden="true"> *</span>
        </div>

        {selecting ? (
          <div className="ftv-selecting-banner">
            {t("select-verse-banner", {
              defaultValue:
                "Tap any verse in the reader, then choose Set as target in the toolbar.",
            })}
            <Button
              onClick={() => {
                game.selectingViaToolbar.value = false;
              }}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </Button>
          </div>
        ) : (
          <>
            {target && (
              <div className="ftv-verse-preview">
                <strong>
                  {formatReference(
                    target.bookId,
                    target.chapterNumber,
                    target.verseNumber,
                    translationBooks
                  )}
                </strong>
                {target.verseText && (
                  <p className="ftv-verse-preview-text">
                    &ldquo;{target.verseText}&rdquo;
                  </p>
                )}
              </div>
            )}
            <div className="ftv-reference-row">
              <input
                className="ftv-input"
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
              <Button variant="primary" onClick={() => void handleRefGo()}>
                {t("go", { defaultValue: "Go" })}
              </Button>
            </div>
            <Button
              onClick={() => {
                game.selectingViaToolbar.value = true;
              }}
            >
              {t("select-from-reader", { defaultValue: "Select from reader…" })}
            </Button>
          </>
        )}
      </FormField>

      <FormField error={chanceError} pulse={errorPulse.value}>
        <div className="ftv-label">
          {t("chances-label", {
            total: steps.length,
            defaultValue: "Chances ({{total}})",
          })}
        </div>
        <p className="ftv-chances-help">
          {t("chances-start", {
            defaultValue:
              "Start with 7. You can add more or remove down to 3. Fill in at least 3 hints. The rest can stay blank.",
          })}
        </p>
        <div className="ftv-steps">
          {steps.map((step, i) => (
            <div key={i} className="ftv-step-row">
              <span className="ftv-step-num">#{i + 1}</span>
              <GrowingHint
                placeholder={t("hint-placeholder", {
                  defaultValue: "Hint…",
                })}
                invalid={chanceError !== null && emptyHints.includes(i)}
                value={step.hint}
                onChange={(hint) => handleStepHintChange(i, hint)}
              />
              {steps.length > MIN_HINTS && (
                <IconButton
                  className="ftv-step-remove"
                  size="sm"
                  icon="close"
                  label={t("remove-chance", {
                    defaultValue: "Remove this chance",
                  })}
                  onClick={() => removeStep(i)}
                />
              )}
            </div>
          ))}
        </div>
        <Button className="ftv-add-step" onClick={addStep}>
          {t("add-chance", { defaultValue: "+ Add chance" })}
        </Button>
      </FormField>

      {notice && <p className="ftv-notice">{notice}</p>}

      <div className="ftv-creator-actions">
        <Button
          className="ftv-btn--grow"
          variant="primary"
          disabled={saving.value}
          onClick={() => void handlePlay()}
        >
          {editing
            ? t("save-and-start", { defaultValue: "Save & Start" })
            : t("start-game", { defaultValue: "Start game" })}
        </Button>
        <Button
          className="ftv-btn--grow"
          disabled={saving.value}
          onClick={handleSave}
        >
          {signedIn
            ? t("save-game", { defaultValue: "Save game" })
            : t("sign-in-to-save", { defaultValue: "Sign in to save games" })}
        </Button>
        <Button onClick={onCancel}>
          {t("cancel", { defaultValue: "Cancel" })}
        </Button>
      </div>
    </div>
  );
}
