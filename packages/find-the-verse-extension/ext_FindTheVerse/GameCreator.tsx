/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { useState } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
import { extractContentText, parseVerseReference } from "seed-bible/managers";
import { bookDisplayName } from "./books";
import type { GameSignals, SavedGame } from "./types";

interface GameCreatorProps {
  game: GameSignals;
  state: SeedBibleState;
  onStart: (saved: SavedGame) => void;
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
    border: "1px solid var(--sb-border-color, #ccc)",
    background: "var(--sb-input-background, #fff)",
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
    background: "var(--sb-secondary-background, #f0f0f0)",
    color: "var(--sb-font-color, #333)",
  },
  versePreview: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "var(--sb-secondary-background, #f5f5f5)",
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
    color: "var(--sb-danger-color, #e63946)",
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
  const [refInput, setRefInput] = useState("");
  const [refError, setRefError] = useState("");

  const target = game.targetVerse.value;
  const steps = game.steps.value;
  const selecting = game.selectingViaToolbar.value;

  async function handleRefGo() {
    const parsed = parseVerseReference(refInput);
    if (!parsed || !parsed.verse) {
      setRefError(
        "Couldn't recognise that reference. Try \u201cJohn 1:1\u201d."
      );
      return;
    }
    setRefError("");

    const tab = state.app.selectedTab.value;
    const translationId = tab?.readingState.translationId.value ?? "BSB";

    let verseText = "";
    try {
      const chapterData = await state.bibleData.getTranslationBookChapter(
        translationId,
        parsed.book,
        parsed.chapter
      );
      const verseNode = chapterData.chapter.content.find(
        (c) => c.type === "verse" && c.number === parsed.verse
      );
      if (verseNode && verseNode.type === "verse") {
        verseText = extractContentText(verseNode.content);
      }
    } catch {
      // verse text is a nice-to-have; don't block on failure
    }

    game.targetVerse.value = {
      bookId: parsed.book,
      chapterNumber: parsed.chapter,
      verseNumber: parsed.verse,
      verseText,
    };
    // Navigate so the creator can see the verse
    void tab?.readingState.selectChapter(parsed.book, parsed.chapter);
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
      <p style={s.heading}>Create a game</p>

      {/* Target verse */}
      <div>
        <div style={s.label}>Secret verse</div>

        {selecting ? (
          <div style={s.selectingBanner}>
            Tap any verse in the reader, then choose{" "}
            <strong>Set as target</strong> in the toolbar.
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
              Cancel
            </button>
          </div>
        ) : (
          <>
            {target && (
              <div style={{ ...s.versePreview, marginBottom: "8px" }}>
                <strong>
                  {bookDisplayName(target.bookId)} {target.chapterNumber}:
                  {target.verseNumber}
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
                placeholder="e.g. John 1:1"
                value={refInput}
                onInput={(e) => {
                  setRefInput((e.target as HTMLInputElement).value);
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
                Go
              </button>
            </div>
            {refError && (
              <div
                style={{
                  color: "var(--sb-danger-color, #e63946)",
                  fontSize: "0.85rem",
                  marginBottom: "6px",
                }}
              >
                {refError}
              </div>
            )}
            <button
              type="button"
              style={{ ...s.btn, ...s.secondaryBtn }}
              onClick={() => {
                game.selectingViaToolbar.value = true;
              }}
            >
              Select from reader…
            </button>
          </>
        )}
      </div>

      {/* Steps / chances */}
      <div>
        <div style={s.label}>Chances ({steps.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {steps.map((step, i) => (
            <div key={i} style={s.stepRow}>
              <span style={s.stepNum}>#{i + 1}</span>
              <input
                style={{ ...s.input, flex: 1 }}
                type="text"
                placeholder="Optional hint…"
                value={step.hint}
                onInput={(e) =>
                  handleStepHintChange(i, (e.target as HTMLInputElement).value)
                }
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  style={s.removeBtn}
                  title="Remove this chance"
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
          + Add chance
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          style={{
            ...s.btn,
            ...s.primaryBtn,
            flex: 1,
            opacity: canSave ? 1 : 0.45,
          }}
          disabled={!canSave}
          onClick={() => {
            if (!target) return;
            onStart({
              id: crypto.randomUUID(),
              targetVerse: target,
              steps: game.steps.peek(),
              createdAtMs: Date.now(),
            });
          }}
        >
          Save game
        </button>
        <button
          type="button"
          style={{ ...s.btn, ...s.secondaryBtn }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
