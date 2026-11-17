import { useLayoutEffect, useRef } from "preact/hooks";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { ChapterChangeBar, VersePickBar } from "./PlaylistEditorWorkspace";
import { PlaylistStepNoteSheet } from "./PlaylistStepNoteSheet";

type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;

/** Keeps the stack, and the toolbar under it, this far inside the reader. */
const READER_INSET_PX = 16;

/**
 * Desktop: the playlist editor's scripture step stacks its banners (verse
 * pick, chapter change) and its note above the reader's toolbar, as a phone
 * stacks them above the chapter pill. Rendered inside that toolbar, it also
 * centres the toolbar over the reader rather than the window, so neither
 * runs under the editor's side panel, and narrows itself to fit the reader.
 */
export function PlaylistEditorToolbarStack(props: {
  state: SeedBibleState;
  index: number;
  item: ScriptureItem;
  resolveBookName: (bookId: string) => string;
}) {
  const { state, index, item, resolveBookName } = props;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const stack = ref.current;
    const toolbar = stack?.parentElement;
    if (!stack || !toolbar) {
      return;
    }
    let reader: HTMLElement | null = null;
    let frame = 0;
    const place = () => {
      if (!reader) {
        return;
      }
      const box = reader.getBoundingClientRect();
      toolbar.style.left = `${box.left + box.width / 2}px`;
      stack.style.width = `${Math.min(480, box.width - READER_INSET_PX * 2)}px`;
    };
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    // The editor's workspace can arrive in the same update as this stack, a
    // moment after it, so it's looked for until it's there.
    const attach = () => {
      reader = document.querySelector<HTMLElement>(".sb-pe-workspace");
      if (!reader) {
        frame = requestAnimationFrame(attach);
        return;
      }
      place();
      observer?.observe(reader);
    };
    attach();
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", place);
      toolbar.style.left = "";
    };
  }, []);

  return (
    <div ref={ref} className="sb-pe-toolbar-stack">
      <VersePickBar state={state} />
      <ChapterChangeBar state={state} />
      <PlaylistStepNoteSheet
        key={index}
        state={state}
        index={index}
        item={item}
        resolveBookName={resolveBookName}
      />
    </div>
  );
}
