import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible";
import { extractContentText, parseVerseReference } from "seed-bible/managers";
import { useI18n } from "seed-bible/i18n";
import { bookDisplayName, isKnownBookId } from "./books";
import type { GameSignals, SavedGame } from "./types";

interface GameCreatorProps {
  game: GameSignals;
  state: SeedBibleState;
  onStart: (draft: Pick<SavedGame, "targetVerse" | "steps">) => Promise<void>;
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
    alignItems: "center" as const,
  },
  stepNum: {
    minWidth: "24px",
    fontWeight: 600,
    opacity: 0.5,
    fontSize: "0.85rem",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#e63946",
    padding: "4px",
    fontSize: "1rem",
    lineHeight: 1,
  },
  selectingBanner: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "var(--sb-primary-color, #4a6cf7)",
    color: "var(--sb-primary-font-color, #fff)",
    fontSize: "0.9rem",
  },
};

export function GameCreator({
  game,
  state,
  onStart,
  onCancel,
}: GameCreatorProps) {
  const refInput = useSignal("");
  const refError = useSignal("");
  const saving = useSignal(false);
  const { t } = useI18n("find-the-verse-extension");

  const target = game.targetVerse.value;
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
      if (!stillCurrent()) return;
      if (!verseText) {
        refError.value = unrecognised;
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
    const updated = game.steps.peek().filter((_, i) => i !== index);
    game.steps.value = updated;
  }

  const canSave = target !== null && steps.length >= 1;

  return (
    <div style={s.root}>
      <p style={s.heading}>
        {editing
          ? t("edit-game", { defaultValue: "Edit game" })
          : t("create-game", { defaultValue: "Create a game" })}
      </p>

      {/* Target verse */}
      <div>
        <div style={s.label}>
          {t("secret-verse", { defaultValue: "Secret verse" })}
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
            {refError.value && (
              <div
                style={{
                  color: "#e63946",
                  fontSize: "0.85rem",
                  marginBottom: "6px",
                }}
              >
                {refError.value}
              </div>
            )}
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
      </div>

      {/* Steps / chances */}
      <div>
        <div style={s.label}>
          {t("chances-label", {
            total: steps.length,
            defaultValue: "Chances ({{total}})",
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {steps.map((step, i) => (
            <div key={i} style={s.stepRow}>
              <span style={s.stepNum}>#{i + 1}</span>
              <input
                style={{ ...s.input, flex: 1 }}
                type="text"
                placeholder={t("hint-placeholder", {
                  defaultValue: "Optional hint…",
                })}
                value={step.hint}
                onInput={(e) =>
                  handleStepHintChange(i, (e.target as HTMLInputElement).value)
                }
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
      </div>

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
            opacity: canSave && !saving.value ? 1 : 0.45,
          }}
          disabled={!canSave || saving.value}
          onClick={() => {
            if (!target || saving.value) return;
            if (!state.login.userId.peek()) {
              game.notice.value = t("sign-in-to-save", {
                defaultValue: "Sign in to save games",
              });
              return;
            }
            saving.value = true;
            void onStart({
              targetVerse: target,
              steps: game.steps.peek(),
            }).finally(() => {
              saving.value = false;
            });
          }}
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
