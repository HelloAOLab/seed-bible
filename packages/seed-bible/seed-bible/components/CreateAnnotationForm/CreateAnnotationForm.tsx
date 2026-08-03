import "./CreateAnnotationForm.css";
import { lazy, Suspense } from "preact/compat";
import { useRef, useState } from "preact/hooks";
import type { Editor } from "@tiptap/core";
import { useI18n } from "../../i18n/I18nManager";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import type { TabsManager } from "../../managers/TabsManager";
import { sanitize } from "../../managers/Sanitization";

// Load TipTap lazily so its (sizeable) bundle is only fetched when the user
// actually opens the annotation composer.
const TipTapEditor = lazy(() => import("../TipTapEditor/TipTapEditor"));

interface CreateAnnotationFormProps {
  annotations: AnnotationsManager;
  tabs: TabsManager;
}

type VerseScope = "chapter" | "verses";

/** Create/edit-annotation screen shown inside the discover pane. */
export function CreateAnnotationForm(props: CreateAnnotationFormProps) {
  const { annotations, tabs } = props;
  const { t } = useI18n();
  const editorRef = useRef<Editor | null>(null);
  const editing = annotations.editingAnnotation.value;
  // Seeded content counts as non-empty so the submit button starts enabled.
  const [editorEmpty, setEditorEmpty] = useState(!editing?.data.html);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bounds the verse pickers using whichever open tab currently has this
  // annotation's chapter loaded. Falls back to unbounded input when no tab
  // has it loaded (e.g. editing a note for a chapter no longer open).
  const numberOfVerses = editing
    ? (tabs.tabs.value
        .map((tab) => tab.readingState.chapterData.value)
        .find(
          (chapter) =>
            chapter?.book.id === editing.bookId &&
            chapter?.chapter.number === editing.chapterNumber
        )?.numberOfVerses ?? null)
    : null;

  const [scope, setScope] = useState<VerseScope>(
    editing?.verseNumber == null ? "chapter" : "verses"
  );
  const [fromVerseText, setFromVerseText] = useState(
    String(editing?.verseNumber ?? 1)
  );
  const [toVerseText, setToVerseText] = useState(
    String(editing?.endVerseNumber ?? editing?.verseNumber ?? 1)
  );

  if (!editing) {
    return null;
  }

  const clampVerse = (value: number): number => {
    const min = 1;
    const max = numberOfVerses ?? Number.MAX_SAFE_INTEGER;
    return Math.min(Math.max(Math.round(value), min), max);
  };

  const applyVerseSelection = (
    nextScope: VerseScope,
    fromText: string,
    toText: string
  ): void => {
    if (nextScope === "chapter") {
      annotations.editingAnnotation.value = {
        ...editing,
        verseNumber: null,
        endVerseNumber: null,
      };
      return;
    }

    const from = clampVerse(parseInt(fromText, 10) || 1);
    const toParsed = parseInt(toText, 10);
    const to = Number.isNaN(toParsed) ? from : clampVerse(toParsed);
    annotations.editingAnnotation.value = {
      ...editing,
      verseNumber: from,
      endVerseNumber: to !== from ? Math.max(from, to) : null,
    };
  };

  const doSave = async () => {
    const editor = editorRef.current;
    const html = editor ? await sanitize(editor.getHTML()) : "";
    annotations.editingAnnotation.value = {
      ...editing,
      data: { ...editing.data, html },
    };
    setSaving(true);
    setError(null);
    try {
      await annotations.saveEditingAnnotation();
    } catch (err) {
      console.error("Failed to save annotation:", err);
      setError(
        t("save-annotation-failed", {
          defaultValue: "Couldn't save the annotation.",
        })
      );
      setSaving(false);
    }
  };

  return (
    <div className="sb-discover-pane">
      <div className="sb-annotation-form-scope">
        <span className="sb-annotation-form-scope-label">
          {t("annotation-scope-label", { defaultValue: "Applies to" })}
        </span>
        <label className="sb-annotation-form-scope-option">
          <input
            type="radio"
            name="annotation-scope"
            checked={scope === "chapter"}
            onChange={() => {
              setScope("chapter");
              applyVerseSelection("chapter", fromVerseText, toVerseText);
            }}
          />
          {t("annotation-scope-chapter", { defaultValue: "Whole chapter" })}
        </label>
        <label className="sb-annotation-form-scope-option">
          <input
            type="radio"
            name="annotation-scope"
            checked={scope === "verses"}
            onChange={() => {
              setScope("verses");
              applyVerseSelection("verses", fromVerseText, toVerseText);
            }}
          />
          {t("annotation-scope-verses", { defaultValue: "Specific verse(s)" })}
        </label>
        {scope === "verses" ? (
          <div className="sb-annotation-form-verse-inputs">
            <input
              type="number"
              className="sb-settings-text-input sb-annotation-verse-input"
              min={1}
              max={numberOfVerses ?? undefined}
              value={fromVerseText}
              aria-label={t("annotation-from-verse-placeholder", {
                defaultValue: "From verse",
              })}
              placeholder={t("annotation-from-verse-placeholder", {
                defaultValue: "From verse",
              })}
              onInput={(event: Event) => {
                const value = (event.currentTarget as HTMLInputElement).value;
                setFromVerseText(value);
                applyVerseSelection("verses", value, toVerseText);
              }}
            />
            <span className="sb-annotation-form-verse-separator">–</span>
            <input
              type="number"
              className="sb-settings-text-input sb-annotation-verse-input"
              min={1}
              max={numberOfVerses ?? undefined}
              value={toVerseText}
              aria-label={t("annotation-to-verse-placeholder", {
                defaultValue: "To verse (optional)",
              })}
              placeholder={t("annotation-to-verse-placeholder", {
                defaultValue: "To verse (optional)",
              })}
              onInput={(event: Event) => {
                const value = (event.currentTarget as HTMLInputElement).value;
                setToVerseText(value);
                applyVerseSelection("verses", fromVerseText, value);
              }}
            />
          </div>
        ) : null}
      </div>

      <Suspense
        fallback={
          <div
            className="sb-settings-text-input sb-playlist-input sb-annotation-editor sb-annotation-editor--loading"
            aria-busy="true"
          />
        }
      >
        <TipTapEditor
          className="sb-settings-text-input sb-playlist-input sb-annotation-editor"
          initialContent={editing.data.html}
          onEditor={(editor) => {
            editorRef.current = editor;
          }}
          onEmptyChange={setEditorEmpty}
        />
      </Suspense>

      {error ? <p className="sb-playlist-add-error">{error}</p> : null}

      <div>
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={() => annotations.cancelEditingAnnotation()}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-settings-save-button"
          onClick={() => void doSave()}
          disabled={saving || editorEmpty}
        >
          {saving
            ? t("saving", { defaultValue: "Saving…" })
            : t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}
