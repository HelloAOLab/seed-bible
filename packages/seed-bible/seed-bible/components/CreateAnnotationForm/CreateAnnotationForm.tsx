import "./CreateAnnotationForm.css";
import { lazy, Suspense, type ComponentType } from "preact/compat";
import { useRef, useState } from "preact/hooks";
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
import {
  isApplePlatform,
  PlainTextAnnotationEditor,
  type AnnotationEditorHandle,
  type AnnotationEditorProps,
} from "./PlainTextAnnotationEditor";

// Load TipTap lazily so its (sizeable) bundle is only fetched when the user
// actually opens the annotation composer. If that fetch fails (e.g. offline
// and not yet cached), fall back to a plain textarea so the note isn't lost.
function loadAnnotationEditor() {
  return lazy<ComponentType<AnnotationEditorProps>>(() =>
    import("../TipTapEditor/TipTapEditor").catch((err: unknown) => {
      console.error("Failed to load the rich text editor:", err);
      editorLoadFailed = true;
      return { default: PlainTextAnnotationEditor };
    })
  );
}

let editorLoadFailed = false;
let AnnotationEditor = loadAnnotationEditor();

/**
 * The editor component for this mount of the form. `lazy()` caches its
 * result, so after a failed load a fresh one is made to retry TipTap the next
 * time the form opens while the browser reports being online. It's captured
 * once per mount so a retry never swaps editors under text being typed.
 */
function useAnnotationEditor(): ComponentType<AnnotationEditorProps> {
  const [editor] = useState(() => {
    if (editorLoadFailed && navigator.onLine) {
      editorLoadFailed = false;
      AnnotationEditor = loadAnnotationEditor();
    }
    return AnnotationEditor;
  });
  return editor;
}

interface CreateAnnotationFormProps {
  annotations: AnnotationsManager;
  tabs: TabsManager;
  toast: (message: string) => void;
}

/** Create/edit-annotation screen shown inside the discover pane. */
export function CreateAnnotationForm(props: CreateAnnotationFormProps) {
  const { annotations, tabs, toast } = props;
  const { t } = useI18n();
  const EditorComponent = useAnnotationEditor();
  const editorRef = useRef<AnnotationEditorHandle | null>(null);
  // Sync re-entry gate: React `saving` state is too late for Mod+Enter
  // (disabled only blocks the button; a second key event can land before
  // setSaving re-renders). Flip this before the first await.
  const savingRef = useRef(false);
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
    if (savingRef.current || editorEmpty) {
      return;
    }
    const editor = editorRef.current;
    if (!editor || editor.isEmpty) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const html = await sanitize(editor.getHTML());
      annotations.editingAnnotation.value = {
        ...editing,
        data: { ...editing.data, html },
      };
      await annotations.saveEditingAnnotation();
      toast(
        t("annotation-saved", {
          defaultValue: "Annotation saved",
        })
      );
      // Leave savingRef true on success — the form unmounts when editing
      // clears. Resetting here would reopen a Mod+Enter race before unmount.
    } catch (err) {
      console.error("Failed to save annotation:", err);
      setError(
        t("save-annotation-failed", {
          defaultValue: "Couldn't save the annotation.",
        })
      );
      setSaving(false);
      savingRef.current = false;
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
        <EditorComponent
          className="sb-settings-text-input sb-annotation-editor"
          initialContent={editing.data.html}
          autofocus="end"
          onEditor={(editor) => {
            editorRef.current = editor;
          }}
          onEmptyChange={setEditorEmpty}
          onModEnter={() => {
            void doSave();
          }}
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
          title={
            isApplePlatform()
              ? t("save-annotation-shortcut-mac", {
                  defaultValue: "Save (⌘Enter)",
                })
              : t("save-annotation-shortcut", {
                  defaultValue: "Save (Ctrl+Enter)",
                })
          }
          aria-keyshortcuts={isApplePlatform() ? "Meta+Enter" : "Control+Enter"}
        >
          {saving
            ? t("saving", { defaultValue: "Saving…" })
            : t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}
