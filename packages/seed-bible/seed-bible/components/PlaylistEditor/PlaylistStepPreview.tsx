import "./PlaylistStepPreview.css";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import {
  minutesLabel,
  playlistItemIcon,
  playlistItemKind,
  playlistItemMinutes,
} from "../playlistItemSubtitle";
import {
  ScripturePreview,
  type ScriptureChapterLoader,
} from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistLinkContent } from "../PlaylistLinkContent/PlaylistLinkContent";
import {
  CompareStepContent,
  QuestionStepContent,
} from "../PlaylistStepContent/PlaylistStepContent";

/**
 * A step as the reader will see it, in the editor's middle column: the
 * passage with its phrases picked out and the note beside it, a note or
 * link as it plays, a question with its answer box, or a comparison.
 */
export function PlaylistStepPreview(props: {
  item: PlaylistItemData;
  stepNumber: number | null;
  stepCount: number;
  loadChapter?: ScriptureChapterLoader;
  resolveBookName: (bookId: string) => string;
}) {
  const { item, stepNumber, stepCount, loadChapter, resolveBookName } = props;
  const { t } = useI18n();
  if (item.type === "scene") {
    return (
      <div className="sb-step-preview" dir="auto">
        <p className="sb-step-preview-eyebrow">
          {t("playlist-item-scene", { defaultValue: "Scene" })}
        </p>
        <h1 className="sb-step-preview-title">{item.title}</h1>
      </div>
    );
  }
  const title =
    item.type === "bible-verse"
      ? item.noteTitle?.trim() || playlistItemLabel(item, t, resolveBookName)
      : item.type === "question"
        ? item.title?.trim() || item.prompt
        : item.title?.trim() || playlistItemLabel(item, t, resolveBookName);
  return (
    <div className="sb-step-preview" dir="auto">
      <p className="sb-step-preview-eyebrow">
        <MaterialIcon>{playlistItemIcon(item)}</MaterialIcon>
        {t("playlist-step-eyebrow", {
          defaultValue: "{{kind}} · Step {{step}} of {{total}} · {{minutes}}",
          kind: playlistItemKind(item, t),
          step: stepNumber ?? "",
          total: stepCount,
          minutes: minutesLabel(playlistItemMinutes(item), t),
        })}
      </p>
      <h1 className="sb-step-preview-title">{title}</h1>
      {item.type === "bible-verse" ? (
        <>
          {item.note ? (
            <div className="sb-step-preview-note">
              <PlaylistHtmlContent html={item.note} loadChapter={loadChapter} />
            </div>
          ) : null}
          <div className="sb-step-preview-passage sb-item-inline-preview">
            {[item.ref, ...(item.refs ?? [])].map((ref, index) => (
              <ScripturePreview
                key={index}
                item={{
                  type: "bible-verse",
                  ref,
                  translationId: item.translationId,
                }}
                loadChapter={loadChapter}
                highlights={item.highlights}
              />
            ))}
          </div>
          {item.question ? (
            <div className="sb-step-preview-question">
              <p className="sb-step-preview-question-eyebrow">
                {t("playlist-question-for-readers", {
                  defaultValue: "Question for readers",
                })}
              </p>
              <p className="sb-step-preview-question-prompt">
                {item.question.prompt}
              </p>
            </div>
          ) : null}
        </>
      ) : item.type === "html" ? (
        <div className="sb-step-preview-note">
          <PlaylistHtmlContent html={item.html} loadChapter={loadChapter} />
        </div>
      ) : item.type === "link" ? (
        <PlaylistLinkContent
          url={item.url}
          title={item.title}
          embed={item.embed}
          preview={item.preview}
        />
      ) : item.type === "question" ? (
        <QuestionStepContent item={item} />
      ) : (
        <CompareStepContent
          item={item}
          loadChapter={loadChapter}
          resolveBookName={resolveBookName}
        />
      )}
    </div>
  );
}
