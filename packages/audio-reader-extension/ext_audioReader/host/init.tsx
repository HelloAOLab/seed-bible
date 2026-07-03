import { computed, effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import type { BibleReadingState } from "seed-bible/managers";

/** Drives the icon swap between play and pause. Shared across the tool. */
const isPlaying = signal(false);

/** Lazily-created shared audio element and the URL currently loaded into it. */
let audioEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "none";
    audioEl.onplay = () => {
      isPlaying.value = true;
    };
    audioEl.onpause = () => {
      isPlaying.value = false;
    };
    audioEl.onended = () => {
      isPlaying.value = false;
      if (audioEl) audioEl.currentTime = 0;
    };
  }
  return audioEl;
}

/**
 * First available reader's mp3 URL for the chapter in view, or null. The
 * Bible API exposes `thisChapterAudioLinks` as a `{ reader: url }` map
 * (e.g. gilbert / hays / souer); we just take the first non-empty entry.
 */
function chapterAudioUrl(readingState: BibleReadingState): string | null {
  const links = readingState.chapterData.value?.thisChapterAudioLinks;
  if (!links) return null;
  return Object.values(links).find((url) => !!url) ?? null;
}

function PlayIcon() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx={18} cy={18} r={18} fill="#D36433" />
      <path d="M14 25V11L25 18L14 25Z" fill="white" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx={18} cy={18} r={18} fill="#D36433" />
      <rect x={13} y={11} width={3.5} height={14} rx={1} fill="white" />
      <rect x={19.5} y={11} width={3.5} height={14} rx={1} fill="white" />
    </svg>
  );
}

export default function initAudioReaderExtension() {
  registerExtension({
    id: "ext_audioReader",
    init: function* (context: SeedBibleState) {
      // The play/pause control lives in the reader's top quick toolbar,
      // beside the bookmark button. It only shows for chapters with audio.
      yield context.tools.registerQuickTool({
        id: "ext_audioReader-play",
        priority: 250,
        title: {
          key: "toolbarTitle",
          defaultValue: "Listen",
          ns: "ext_audioReader",
        },
        icon: () => (isPlaying.value ? <PauseIcon /> : <PlayIcon />),
        isVisible: (ctx) =>
          computed(() => chapterAudioUrl(ctx.readingState) !== null),
        onSelect: (ctx) => {
          const url = chapterAudioUrl(ctx.readingState);
          if (!url) {
            context.app.toast("No audio is available for this chapter.");
            return;
          }
          const el = ensureAudio();
          if (!el) return;
          if (currentUrl !== url) {
            el.src = url;
            currentUrl = url;
          }
          if (el.paused) {
            void el.play();
          } else {
            el.pause();
          }
        },
      });

      // Stop and rewind whenever the active chapter changes so a previous
      // chapter's narration never keeps playing under a new one.
      yield effect(() => {
        // Reading `.value` subscribes this effect to chapter navigation.
        void context.app.currentReadingState.value;
        if (audioEl && !audioEl.paused) {
          audioEl.pause();
          audioEl.currentTime = 0;
        }
        isPlaying.value = false;
      });
    },
  });
}
