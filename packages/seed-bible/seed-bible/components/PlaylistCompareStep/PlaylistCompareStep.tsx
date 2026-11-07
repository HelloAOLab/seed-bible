import "../PlaylistStepPage/PlaylistStepPage.css";
import "./PlaylistCompareStep.css";
import type { ComponentChild } from "preact";
import { useRef } from "preact/hooks";
import type { VerseRef } from "../../managers/BibleDataManager";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { useScrollToTopOnMount } from "../PlaylistStepPage/PlaylistStepPage";

/**
 * A playing playlist's compare step, shown in the reader in place of the
 * chapter: its two passages side by side where there's room for both, else
 * one above the other, and the author's note on them below.
 */
export function PlaylistCompareStep(props: {
  /** Null where the reader's own header carries the title instead. */
  title: string | null;
  passages: [ComparePassage, ComparePassage];
  note: { title: string | null; html: string | null } | null;
  /** A note's links to passages and to other steps. */
  onReferenceClick?: (ref: VerseRef) => void;
  onStepClick?: (index: number) => void;
  /** Wraps the note's content (the reader's presence gutter). */
  wrapNote?: (note: ComponentChild) => ComponentChild;
}) {
  const { title, passages, note, wrapNote = (content) => content } = props;
  const ref = useRef<HTMLElement>(null);
  useScrollToTopOnMount(ref);
  return (
    <article ref={ref} className="sb-playlist-step-page sb-playlist-compare">
      {title ? (
        <h2 className="sb-playlist-step-page-title" dir="auto">
          {title}
        </h2>
      ) : null}
      <div className="sb-playlist-compare-columns">
        {passages.map((passage, index) => (
          <section key={index} className="sb-playlist-compare-column">
            <h3 className="sb-playlist-compare-passage" dir="auto">
              {passage.label}
            </h3>
            {passage.content}
          </section>
        ))}
      </div>
      {note ? (
        <section className="sb-playlist-compare-note">
          {note.title ? (
            <h3 className="sb-playlist-compare-note-title" dir="auto">
              {note.title}
            </h3>
          ) : null}
          {note.html
            ? wrapNote(
                <PlaylistHtmlContent
                  html={note.html}
                  onReferenceClick={props.onReferenceClick}
                  onStepClick={props.onStepClick}
                />
              )
            : null}
        </section>
      ) : null}
    </article>
  );
}

export interface ComparePassage {
  /** The passage's reference, e.g. "John 1:1-5". */
  label: string;
  /** The passage's scripture, as the reader draws it. */
  content: ComponentChild;
}
