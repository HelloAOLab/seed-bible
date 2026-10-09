import "./AudioScrubber.css";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import {
  formatPlaybackTime,
  type AudioPlaybackController,
  type PlaybackVerseMark,
} from "../../managers/AudioPlaybackManager";

/** How long a tapped-open handle stays up when it isn't used. */
export const SCRUB_HANDLE_HIDE_DELAY_MS = 3_000;

/**
 * The least room, on average, each verse needs on the bar for every verse to
 * get a tick. Below it they run together, so only section starts are marked.
 * On a 375px phone the bar is about 230px: John 2's 25 verses get ~9px each
 * and all show, John 1's 51 get ~4.5px and only its headings do.
 */
const MIN_TICK_SPACING_PX = 6;

/** How far a finger must travel before a touch counts as a drag, not a tap. */
const DRAG_THRESHOLD_PX = 6;

/** How far one arrow-key press moves a recording. Speech moves one verse. */
const KEYBOARD_STEP_SECONDS = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function progressFraction(time: number, duration: number | null): number {
  return duration ? clamp(time / duration, 0, 1) : 0;
}

interface AudioScrubberProps {
  playback: AudioPlaybackController;
  /**
   * Shows progress after the bar: the time left (`m:ss`) for a recording, or
   * the verse being read out of the total (`4/12`) for speech, whose timing
   * isn't known.
   */
  showTimeRemaining?: boolean;
  className?: string;
}

/**
 * A progress bar for `playback` that can be dragged to move through it.
 *
 * The handle stays hidden so the bar reads as plain progress until someone
 * reaches for it. A mouse reveals it by hovering, and a click jumps to where
 * it lands.
 *
 * A finger can't hover, and the bar is too thin to aim at, so touch works
 * differently:
 * - While the handle is hidden, dragging anywhere on the bar moves playback
 *   *from where it is* by however far the finger travels, rather than jumping
 *   to wherever the finger happened to land. A tap without a drag only
 *   reveals the handle, so brushing the bar never moves the audio.
 * - Once the handle is showing, a tap jumps to the finger and can be dragged
 *   on from. A handle tapped open and then left alone hides again after
 *   {@link SCRUB_HANDLE_HIDE_DELAY_MS}.
 *
 * Playback only moves when the finger or mouse is let go; until then the bar
 * previews where it would land, with a card above the handle naming the verse
 * there (and its section heading, when it starts one), and a tick wherever a
 * verse starts — a thicker one where a section does. Speech counted in verses
 * snaps to whole verses, since there's nowhere in between to land.
 */
export function AudioScrubber(props: AudioScrubberProps) {
  const { playback } = props;
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHovering = useRef(false);
  const isHandleVisible = useSignal(false);
  /** Where the handle is being dragged to, or null when it isn't. */
  const dragTime = useSignal<number | null>(null);
  /**
   * A touch on the bar while the handle was hidden: where the finger went
   * down and where playback was then, so a drag can move playback by how far
   * the finger travels. Null otherwise.
   */
  const relativeDrag = useRef<{ startX: number; startTime: number } | null>(
    null
  );

  const cancelHide = () => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      isHandleVisible.value = false;
    }, SCRUB_HANDLE_HIDE_DELAY_MS);
  };

  useEffect(() => cancelHide, []);

  const byVerse = playback.unit === "verses";
  const duration = playback.duration.value;
  const time = dragTime.value ?? playback.currentTime.value;
  const fraction = progressFraction(time, duration);
  const percent = `${fraction * 100}%`;
  // A verse position names the verse being read, so the last one is one short
  // of the count; a recording can be wound right to its end.
  const lastPosition = byVerse ? Math.max(0, (duration ?? 0) - 1) : duration;
  const isDragging = dragTime.value !== null;
  const preview = isDragging
    ? (playback.verseAt?.(dragTime.value!) ?? null)
    : null;
  const marks = isDragging && duration ? visibleMarks(duration) : [];

  /**
   * The verse ticks to draw: every verse's when the bar has room to tell them
   * apart, or only the ones starting a section when they'd crowd into a
   * smear (John 1's 51 verses on a phone).
   */
  function visibleMarks(duration: number): PlaybackVerseMark[] {
    const all = playback.verseMarks?.() ?? [];
    if (all.length === 0) return [];
    const width = trackRef.current?.getBoundingClientRect().width ?? 0;
    const roomy = width / all.length >= MIN_TICK_SPACING_PX;
    // The first verse starts at the very beginning, where a tick would only
    // blur the end of the bar.
    return all.filter(
      (mark) =>
        mark.position > 0 &&
        mark.position <= duration &&
        (roomy || mark.startsSection)
    );
  }

  /** The playback time under `clientX`, or null if the bar can't say yet. */
  const timeAt = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track || !duration) return null;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return null;
    let fraction = (clientX - rect.left) / rect.width;
    if (getComputedStyle(track).direction === "rtl") fraction = 1 - fraction;
    const position = clamp(fraction, 0, 1) * duration;
    // Each verse owns an equal stretch of the bar; landing anywhere in one
    // picks that verse.
    return byVerse ? Math.min(Math.floor(position), duration - 1) : position;
  };

  const onPointerEnter = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    isHovering.current = true;
    cancelHide();
    isHandleVisible.value = true;
  };

  const onPointerLeave = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    isHovering.current = false;
    if (dragTime.value === null) isHandleVisible.value = false;
  };

  /**
   * Where playback would be after the finger has travelled `deltaX` pixels
   * along the bar from where `relativeDrag` started, or null if the bar
   * can't say yet. The whole bar's width spans the whole recording.
   */
  const timeAfterDelta = (deltaX: number): number | null => {
    const track = trackRef.current;
    const start = relativeDrag.current;
    if (!track || !start || !duration || lastPosition === null) return null;
    const width = track.getBoundingClientRect().width;
    if (width <= 0) return null;
    const direction = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    const position =
      start.startTime + ((direction * deltaX) / width) * duration;
    return clamp(byVerse ? Math.round(position) : position, 0, lastPosition);
  };

  const onPointerDown = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!isHandleVisible.value && event.pointerType !== "mouse") {
      isHandleVisible.value = true;
      cancelHide();
      relativeDrag.current = {
        startX: event.clientX,
        startTime: playback.currentTime.peek(),
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    const target = timeAt(event.clientX);
    if (target === null) return;
    cancelHide();
    isHandleVisible.value = true;
    dragTime.value = target;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    const relative = relativeDrag.current;
    if (relative) {
      const deltaX = event.clientX - relative.startX;
      // A finger wobbles a little even when it means to tap; only a real
      // drag starts moving playback.
      if (dragTime.value === null && Math.abs(deltaX) < DRAG_THRESHOLD_PX) {
        return;
      }
      dragTime.value = timeAfterDelta(deltaX) ?? dragTime.value;
      return;
    }
    if (dragTime.value === null) return;
    dragTime.value = timeAt(event.clientX) ?? dragTime.value;
  };

  const finishDrag = (commit: boolean) => {
    relativeDrag.current = null;
    const target = dragTime.value;
    dragTime.value = null;
    if (target !== null && commit) playback.seek(target);
    if (!isHovering.current) scheduleHide();
  };

  const onKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (!duration || lastPosition === null) return;
    const current = playback.currentTime.peek();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = byVerse ? 1 : KEYBOARD_STEP_SECONDS;
    let target: number;
    switch (event.key) {
      case "ArrowUp":
        target = current + step;
        break;
      case "ArrowDown":
        target = current - step;
        break;
      case "ArrowRight":
        target = current + (rtl ? -1 : 1) * step;
        break;
      case "ArrowLeft":
        target = current + (rtl ? 1 : -1) * step;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = lastPosition;
        break;
      default:
        return;
    }
    event.preventDefault();
    playback.seek(clamp(target, 0, lastPosition));
  };

  const classes = ["sb-audio-scrubber"];
  if (isHandleVisible.value) classes.push("sb-audio-scrubber-handle-visible");
  if (dragTime.value !== null) classes.push("sb-audio-scrubber-dragging");
  if (props.className) classes.push(props.className);

  return (
    <div className={classes.join(" ")}>
      <div
        ref={trackRef}
        className="sb-audio-scrubber-hit-area"
        role="slider"
        tabIndex={0}
        aria-label={t("audio-playback-position", {
          defaultValue: "Playback position",
        })}
        aria-valuemin={0}
        aria-valuemax={Math.floor(lastPosition ?? 0)}
        aria-valuenow={Math.floor(time)}
        aria-valuetext={
          byVerse
            ? t("audio-playback-verse", {
                defaultValue: "Verse {{current}} of {{total}}",
                current: time + 1,
                total: duration ?? 0,
              })
            : t("audio-playback-time", {
                defaultValue: "{{current}} of {{total}}",
                current: formatPlaybackTime(time),
                total: formatPlaybackTime(duration ?? 0),
              })
        }
        aria-disabled={!duration}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => finishDrag(true)}
        onPointerCancel={() => finishDrag(false)}
        onKeyDown={onKeyDown}
      >
        <div className="sb-audio-scrubber-track">
          <div className="sb-audio-scrubber-fill" style={{ width: percent }} />
          {marks.map((mark) => (
            <div
              key={mark.position}
              className={`sb-audio-scrubber-tick${
                mark.startsSection ? " sb-audio-scrubber-tick-section" : ""
              }`}
              style={{
                insetInlineStart: `${(mark.position / duration!) * 100}%`,
              }}
              aria-hidden="true"
            />
          ))}
          <div
            className="sb-audio-scrubber-handle"
            style={{ insetInlineStart: percent }}
          />
          {preview && (
            <div
              className="sb-audio-scrubber-preview"
              style={{
                insetInlineStart: percent,
                "--sb-audio-scrubber-preview-shift": fraction,
              }}
              aria-hidden="true"
            >
              {preview.heading && (
                <span className="sb-audio-scrubber-preview-heading">
                  {preview.heading}
                </span>
              )}
              <span className="sb-audio-scrubber-preview-verse">
                {t("audio-scrub-verse", {
                  defaultValue: "Verse {{verse}}",
                  verse: preview.number,
                })}
              </span>
            </div>
          )}
        </div>
      </div>
      {props.showTimeRemaining && (
        <span className="sb-audio-scrubber-remaining">
          {duration === null
            ? "--:--"
            : byVerse
              ? `${time + 1}/${duration}`
              : formatPlaybackTime(duration - time)}
        </span>
      )}
    </div>
  );
}

const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * `playback`'s progress drawn as a ring, for wrapping around a play button
 * that stands in for the full bar while paused.
 */
export function AudioProgressRing(props: {
  playback: AudioPlaybackController;
}) {
  const fraction = progressFraction(
    props.playback.currentTime.value,
    props.playback.duration.value
  );
  return (
    <svg
      className="sb-audio-progress-ring"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <circle
        className="sb-audio-progress-ring-track"
        cx={24}
        cy={24}
        r={RING_RADIUS}
      />
      <circle
        className="sb-audio-progress-ring-fill"
        cx={24}
        cy={24}
        r={RING_RADIUS}
        stroke-dasharray={RING_CIRCUMFERENCE}
        stroke-dashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
        // Starts the ring at twelve o'clock rather than three.
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}
