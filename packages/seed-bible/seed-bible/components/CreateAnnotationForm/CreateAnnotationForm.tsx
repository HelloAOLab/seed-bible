import "./CreateAnnotationForm.css";
import { lazy, Suspense, type ComponentType } from "preact/compat";
import { useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import {
  annotationVerseNumbers,
  findAnnotationChapterData,
  formatAnnotationVerseNumbers,
  type Annotation,
  type AnnotationsManager,
} from "../../managers/AnnotationsManager";
import { extractContentText } from "../../managers/ChapterText";
import {
  AnnotationAuthor,
  annotationBookName,
  annotationLocationLabel,
  AnnotationPreview,
} from "../Discover/AnnotationsSection";
import { DiscoverPanelLayout } from "../Discover/DiscoverPanelHeader";
import type { ChapterVerse } from "../../managers/FreeUseBibleAPI";
import type { TabsManager } from "../../managers/TabsManager";
import { sanitize } from "../../managers/Sanitization";
import { captureEvent, isApplePlatform } from "../../managers/Utils";
import {
  PlainTextAnnotationEditor,
  type AnnotationEditorHandle,
  type AnnotationEditorProps,
} from "./PlainTextAnnotationEditor";
import { retryChunkImport } from "./retryChunkImport";
import { useAnnotationAuthorProfile } from "../Discover/useAnnotationAuthorProfile";
import type { LoginManager } from "../../managers";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";

// Load TipTap lazily so its (sizeable) bundle is only fetched when the user
// actually opens the annotation composer. If that fetch fails (e.g. offline
// and not yet cached), fall back to a plain textarea so the note isn't lost.
function loadAnnotationEditor(isRetry: boolean) {
  // The composer is never server-rendered; the SSR guard keeps TipTap (~800 KB)
  // out of the single-file SSR bundle.
  const load = () =>
    import.meta.env.SSR
      ? Promise.resolve({ default: PlainTextAnnotationEditor })
      : import("../TipTapEditor/TipTapEditor");
  return lazy<ComponentType<AnnotationEditorProps>>(() =>
    (isRetry ? retryChunkImport(load) : load()).catch((err: unknown) => {
      console.error("Failed to load the rich text editor:", err);
      // A failure while online is likely a broken deploy rather than a lost
      // connection, and would otherwise only show up as users quietly getting
      // the plain-text editor.
      captureEvent("annotation_editor_load_failed", {
        online: navigator.onLine,
        retry: isRetry,
        error: err instanceof Error ? err.message : String(err),
      });
      editorLoadFailed = true;
      return { default: PlainTextAnnotationEditor };
    })
  );
}

let editorLoadFailed = false;
let AnnotationEditor = loadAnnotationEditor(false);

/**
 * The editor component for this mount of the form. `lazy()` caches its
 * result, so after a failed load a fresh one is made to retry TipTap the next
 * time the form opens while the browser reports being online. It's captured
 * once per mount so a retry never swaps editors under text being typed.
 *
 * `navigator.onLine` only says a network interface is up, not that the
 * network works (a captive portal or flaky Wi-Fi still reads as online), so
 * the retry is a guess. If it fails, the user sees the loading box and then
 * the textarea again, and the failure is reported with `retry: true`.
 */
function useAnnotationEditor(): ComponentType<AnnotationEditorProps> {
  const [editor] = useState(() => {
    if (editorLoadFailed && navigator.onLine) {
      editorLoadFailed = false;
      AnnotationEditor = loadAnnotationEditor(true);
    }
    return AnnotationEditor;
  });
  return editor;
}

interface CreateAnnotationFormProps {
  annotations: AnnotationsManager;
  tabs: TabsManager;
  toast: (message: string) => void;
  onClose: () => void;
  login: LoginManager;
}

/** Back button plus "Annotate {location}", for the form's header. */
function CreateAnnotationTitle(props: {
  annotations: AnnotationsManager;
  editing: Annotation;
  tabs: TabsManager;
  login: LoginManager;
  parent?: Annotation | undefined;
}) {
  const { annotations, editing, tabs, login, parent } = props;
  const { t } = useI18n();
  const parentAuthorId = editing.data.replyToUserId ?? parent?.data.userId;
  const { name } = useAnnotationAuthorProfile(parentAuthorId, login);

  return (
    <div className="sb-discover-title-row">
      <IconButton
        icon="arrow_back"
        label={t("back", { defaultValue: "Back" })}
        onClick={() => annotations.cancelEditingAnnotation()}
      />
      <span className="sb-discover-title" dir="auto">
        {editing.data.replyTo
          ? name.value.length > 0 && parentAuthorId !== login.userId.value
            ? t("reply-title", {
                author: name.value,
                defaultValue: "Reply to {{author}}",
              })
            : t("reply", {
                defaultValue: "Reply",
              })
          : t("annotate-title", {
              location: annotationLocationLabel(editing, tabs),
              defaultValue: "Annotate {{location}}",
            })}
      </span>
    </div>
  );
}

function ParentPreview(props: {
  parent: Annotation;
  login: LoginManager;
  verseReference: string | null;
}) {
  const { parent, login, verseReference } = props;

  return (
    <div className="sb-reply-parent-preview">
      <div className="sb-reply-parent-preview-header">
        <AnnotationAuthor login={login} userId={parent.data.userId} />
        {verseReference && (
          <span className="sb-reply-parent-preview-reference">
            {verseReference}
          </span>
        )}
      </div>
      <AnnotationPreview html={parent.data.html} />
    </div>
  );
}

/** Create/edit-annotation screen shown inside the discover pane. */
export function CreateAnnotationForm(props: CreateAnnotationFormProps) {
  const { annotations, tabs, toast, onClose, login } = props;
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
  const verseReference =
    verseNumbers.length > 0
      ? `${annotationBookName(editing, tabs)} ${editing.chapterNumber}:${formatAnnotationVerseNumbers(verseNumbers)}`
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

  const replyTo = editing.data.replyTo;
  const parent = replyTo
    ? annotations
        .visibleAnnotationsForChapter(editing.bookId, editing.chapterNumber)
        .find((curr) => curr.id === replyTo)
    : undefined;

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
    <DiscoverPanelLayout
      title={
        <CreateAnnotationTitle
          annotations={annotations}
          editing={editing}
          tabs={tabs}
          parent={parent}
          login={login}
        />
      }
      onClose={onClose}
    >
      {parent && (
        <ParentPreview
          login={login}
          parent={parent}
          verseReference={verseReference}
        />
      )}
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

      {replyTo && (
        <span className="sb-reply-editor-label">
          {t("your-reply", { defaultValue: "Your reply" })}
        </span>
      )}

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
        <Button
          className="sb-reading-plans-back"
          onClick={() => annotations.cancelEditingAnnotation()}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </Button>
        <Button
          variant="primary"
          className="sb-settings-save-button"
          onClick={() => void doSave()}
          disabled={editorEmpty}
          loading={saving}
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
            : replyTo
              ? t("reply", { defaultValue: "Reply" })
              : t("save", { defaultValue: "Save" })}
        </Button>
      </div>
    </DiscoverPanelLayout>
  );
}
