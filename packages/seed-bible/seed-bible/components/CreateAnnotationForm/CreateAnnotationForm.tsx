import "./CreateAnnotationForm.css";
import { lazy, Suspense } from "preact/compat";
import { useRef, useState } from "preact/hooks";
import type { Editor } from "@tiptap/core";
import { useI18n } from "../../i18n/I18nManager";
import {
  annotationVerseNumbers,
  findAnnotationChapterData,
  formatAnnotationVerseNumbers,
  type AnnotationsManager,
} from "../../managers/AnnotationsManager";
import { extractContentText } from "../../managers/ChapterText";
import type { ChapterVerse } from "../../managers/FreeUseBibleAPI";
import type { TabsManager } from "../../managers/TabsManager";
import { sanitize } from "../../managers/Sanitization";

// Load TipTap lazily so its (sizeable) bundle is only fetched when the user
// actually opens the annotation composer.
const TipTapEditor = lazy(() => import("../TipTapEditor/TipTapEditor"));

interface CreateAnnotationFormProps {
  annotations: AnnotationsManager;
  tabs: TabsManager;
}

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

  if (!editing) {
    return null;
  }

  const verseNumbers = annotationVerseNumbers(editing);
  const chapterData =
    verseNumbers.length > 0 ? findAnnotationChapterData(editing, tabs) : null;
  const bookName =
    chapterData?.book.name ?? chapterData?.book.commonName ?? editing.bookId;
  const verseReference =
    verseNumbers.length > 0
      ? `${bookName} ${editing.chapterNumber}:${formatAnnotationVerseNumbers(verseNumbers)}`
      : null;
  const verseQuoteText = chapterData
    ? chapterData.chapter.content
        .filter(
          (c): c is ChapterVerse =>
            c.type === "verse" && verseNumbers.includes(c.number)
        )
        .map((verse) => extractContentText(verse.content))
        .join(" ")
    : null;

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
      {verseReference ? (
        <div className="sb-annotation-verse-quote">
          <p className="sb-annotation-verse-quote-reference">
            {verseReference}
          </p>
          {verseQuoteText ? (
            <p className="sb-annotation-verse-quote-text">{verseQuoteText}</p>
          ) : null}
        </div>
      ) : null}

      <Suspense
        fallback={
          <div
            className="sb-settings-text-input sb-annotation-editor sb-annotation-editor--loading"
            aria-busy="true"
          />
        }
      >
        <TipTapEditor
          className="sb-settings-text-input sb-annotation-editor"
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
