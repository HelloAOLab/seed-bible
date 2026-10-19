import type {
  AudioPlaybackController,
  PlaybackVerseMark,
} from "../../managers/AudioPlaybackManager";
import type { VerseRef } from "../../managers/PlaylistManager";

/**
 * Where narration should start for a passage, in the controller's units:
 * the position of the passage's first verse, found among the scrubber's
 * verse marks. Null when the passage starts at the chapter's beginning or
 * there are no marks to go by, in which case playing from the start is right.
 */
export function narrationStartFor(
  controller: Pick<AudioPlaybackController, "verseAt" | "verseMarks">,
  ref: Pick<VerseRef, "verse">,
  marks: PlaybackVerseMark[] = controller.verseMarks?.() ?? []
): number | null {
  if (ref.verse == null || ref.verse <= 1) {
    return null;
  }
  const mark = marks.find(
    (candidate) =>
      controller.verseAt?.(candidate.position)?.number === ref.verse
  );
  return mark ? mark.position : null;
}

/**
 * Whether narration at `position` has read past the end of `ref`: the verse
 * being read is beyond the passage's last verse, or the recording has run
 * out. A whole-chapter passage ends with the chapter.
 */
export function passageNarrated(
  controller: Pick<AudioPlaybackController, "verseAt" | "duration">,
  ref: Pick<VerseRef, "verse" | "endVerse" | "toEndOfChapter">,
  position: number
): boolean {
  const duration = controller.duration.value;
  if (duration !== null && position >= duration) {
    return true;
  }
  if (ref.verse == null || ref.toEndOfChapter) {
    return false;
  }
  const lastVerse = ref.endVerse ?? ref.verse;
  const reading = controller.verseAt?.(position)?.number;
  return reading != null && reading > lastVerse;
}
