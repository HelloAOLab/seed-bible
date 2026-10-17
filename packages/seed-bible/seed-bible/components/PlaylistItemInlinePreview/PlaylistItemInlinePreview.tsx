import "./PlaylistItemInlinePreview.css";
import { useEffect, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TranslationBookChapter } from "../../managers/FreeUseBibleAPI";
import {
  expandCrossChapterItem,
  type PlaylistItemData,
} from "../../managers/PlaylistManager";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { passageVerses, type PassageVerse } from "../scripturePassage";

/**
 * Loads one chapter for a scripture preview. `translationId` is the item's own
 * translation when it pinned one; otherwise the loader picks the reader's.
 */
export type ScriptureChapterLoader = (
  translationId: string | undefined,
  bookId: string,
  chapter: number
) => Promise<TranslationBookChapter>;

type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;

interface PassageSection {
  chapter: number;
  verses: PassageVerse[];
}

type PassageState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; sections: PassageSection[] };

/**
 * The collapsible preview shown beneath an item in the playlist and reading
 * plan editors, so an author can read what they added without leaving the
 * editor: the referenced verses for scripture, the text for a text item, and
 * the title and URL for a link.
 */
export function PlaylistItemInlinePreview(props: {
  item: PlaylistItemData;
  loadChapter?: ScriptureChapterLoader;
  id?: string;
}) {
  const { item, loadChapter, id } = props;
  const { t } = useI18n();

  return (
    <div id={id} className="sb-item-inline-preview" dir="auto">
      {item.type === "bible-verse" ? (
        <ScripturePreview item={item} loadChapter={loadChapter} />
      ) : item.type === "html" ? (
        <PlaylistHtmlContent html={item.html} />
      ) : (
        <div className="sb-item-inline-preview-link">
          <span className="sb-item-inline-preview-link-title">
            {item.title?.trim() ||
              t("playlist-item-link", { defaultValue: "Link" })}
          </span>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.url}
          </a>
        </div>
      )}
    </div>
  );
}

function ScripturePreview(props: {
  item: ScriptureItem;
  loadChapter?: ScriptureChapterLoader;
}) {
  const { item, loadChapter } = props;
  const { t } = useI18n();
  const [state, setState] = useState<PassageState>({ status: "loading" });

  // Keyed on the ref's contents, not the object: editor lists rebuild items on
  // every render, which would otherwise refetch on each keystroke elsewhere.
  const refKey = JSON.stringify([item.translationId, item.ref]);

  useEffect(() => {
    if (!loadChapter) {
      setState({ status: "error" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    const pieces = expandCrossChapterItem(item) as ScriptureItem[];
    Promise.all(
      pieces.map(async (piece) => ({
        chapter: piece.ref.chapter,
        verses: passageVerses(
          await loadChapter(
            piece.translationId,
            piece.ref.bookId,
            piece.ref.chapter
          ),
          piece.ref
        ),
      }))
    ).then(
      (sections) => {
        if (!cancelled) setState({ status: "ready", sections });
      },
      () => {
        if (!cancelled) setState({ status: "error" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [refKey, loadChapter]);

  if (state.status === "loading") {
    return (
      <p className="sb-item-inline-preview-status">
        {t("loading", { defaultValue: "Loading…" })}
      </p>
    );
  }

  if (
    state.status === "error" ||
    state.sections.every((section) => section.verses.length === 0)
  ) {
    return (
      <p className="sb-item-inline-preview-status">
        {t("playlist-item-preview-unavailable", {
          defaultValue: "Couldn't load this passage.",
        })}
      </p>
    );
  }

  const multiChapter = state.sections.length > 1;
  return (
    <div className="sb-item-inline-preview-passage">
      {state.sections.map((section) => (
        <p key={section.chapter}>
          {multiChapter ? (
            <span className="sb-item-inline-preview-chapter">
              {t("chapter-number", {
                defaultValue: "Chapter {{number}}",
                number: section.chapter,
              })}
            </span>
          ) : null}
          {section.verses.map((verse) => (
            <span key={verse.number}>
              <sup className="sb-item-inline-preview-verse-number">
                {verse.number}
              </sup>
              {verse.text}{" "}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
