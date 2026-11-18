import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Button } from "seed-bible/components";
import { formatReference } from "./books";
import { SoundToggle } from "./SoundToggle";
import type { TargetVerse } from "./types";
import "./celebration.css";

type Translate = (key: string, options?: Record<string, unknown>) => string;

const COLORS = [
  "var(--sb-primary-color, #e07b4c)",
  "#f1a208",
  "#2a9d8f",
  "#e9c46a",
  "#a8dadc",
  "#e76f51",
];
const PIECES = 120;
const CONFETTI_MS = 4200;

function Confetti() {
  const [done, setDone] = useState(false);
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.2 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 30,
        spin: 360 + Math.random() * 720,
        size: 6 + Math.random() * 6,
        round: i % 3 === 0,
        color: COLORS[i % COLORS.length],
      })),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), CONFETTI_MS);
    return () => clearTimeout(timer);
  }, []);

  if (done) return null;
  return (
    <div className="ftv-confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className={`ftv-confetti-piece${piece.round ? " ftv-confetti-piece--round" : ""}`}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * (piece.round ? 1 : 0.6)}px`,
            background: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            "--ftv-drift": `${piece.drift}vw`,
            "--ftv-spin": `${piece.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Full-screen win moment over the reader, on every screen size. Loaded only
 * when a round is won.
 */
export default function WinCelebration({
  target,
  guessCount,
  translationBooks,
  t,
  onBack,
  onDismiss,
}: {
  target: TargetVerse;
  guessCount: number;
  translationBooks:
    | readonly { id: string; name?: string; commonName?: string }[]
    | undefined;
  t: Translate;
  onBack: () => void;
  onDismiss: () => void;
}) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const translate = (key: string, options?: Record<string, unknown>) =>
    t(key, { ...options, ns: "find-the-verse-extension" });

  return (
    <div className="ftv-celebration">
      <Confetti />
      <div
        className="ftv-celebration-card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="ftv-celebration-title"
      >
        <div className="ftv-celebration-emoji" aria-hidden="true">
          🎉
        </div>
        <p id="ftv-celebration-title" className="ftv-celebration-title">
          {translate("you-found-it", { defaultValue: "You found it!" })}
        </p>
        <p className="ftv-celebration-reference">
          {formatReference(
            target.bookId,
            target.chapterNumber,
            target.verseNumber,
            translationBooks
          )}
        </p>
        {target.verseText && (
          <p className="ftv-celebration-verse">
            &ldquo;{target.verseText}&rdquo;
          </p>
        )}
        {guessCount > 0 && (
          <p className="ftv-celebration-guesses">
            {translate("guess-count", {
              count: guessCount,
              defaultValue:
                guessCount === 1 ? "{{count}} guess" : "{{count}} guesses",
            })}
          </p>
        )}
        <div className="ftv-celebration-actions">
          <Button buttonRef={backRef} variant="primary" onClick={onBack}>
            {translate("back-to-menu", { defaultValue: "Back to games" })}
          </Button>
          <Button onClick={onDismiss}>
            {translate("keep-reading", { defaultValue: "Keep reading" })}
          </Button>
        </div>
        <SoundToggle
          t={translate}
          className="ftv-celebration-sound"
          variant="ghost"
          size="sm"
        />
      </div>
    </div>
  );
}
