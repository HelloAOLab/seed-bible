/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { useMemo } from "preact/hooks";
import { bookDisplayName } from "./books";
import {
  buildPartialReveal,
  resultMessage,
  revealThreshold,
} from "./gameLogic";
import type { GameSignals } from "./types";
import type { SeedBibleState } from "seed-bible";

interface GamePlayerProps {
  game: GameSignals;
  state: SeedBibleState;
  onReset: () => void;
}

function Confetti() {
  const colors = [
    "#e63946",
    "#f1a208",
    "#2a9d8f",
    "#264653",
    "#e9c46a",
    "#a8dadc",
  ];
  const pieces = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div
      style={{
        position: "relative",
        height: "80px",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes ftv-fall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(90px)  rotate(540deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i / 48) * 100}%`,
            top: 0,
            width: `${6 + (i % 4)}px`,
            height: `${6 + (i % 3)}px`,
            borderRadius: i % 3 === 0 ? "50%" : "2px",
            background: colors[i % colors.length],
            animation: `ftv-fall ${1.2 + (i % 5) * 0.15}s ${(i % 7) * 0.1}s ease-in both`,
          }}
        />
      ))}
    </div>
  );
}

const s = {
  root: {
    padding: "16px",
    color: "var(--sb-font-color, #333)",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "16px",
  },
  pill: (color: string) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "99px",
    background: color,
    color: "#fff",
    fontSize: "0.8rem",
    fontWeight: 600,
  }),
  card: {
    padding: "12px 14px",
    borderRadius: "8px",
    background: "var(--sb-secondary-background, #f5f5f5)",
  },
  btn: (primary = false) => ({
    padding: "9px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
    background: primary
      ? "var(--sb-primary-color, #4a6cf7)"
      : "var(--sb-secondary-background, #e8e8e8)",
    color: primary
      ? "var(--sb-primary-font-color, #fff)"
      : "var(--sb-font-color, #333)",
  }),
};

export function GamePlayer({ game, state, onReset }: GamePlayerProps) {
  const target = game.targetVerse.value;
  const steps = game.steps.value;
  const guessCount = game.guessCount.value;
  const lastResult = game.lastResult.value;
  const won = game.won.value;
  const revealed = game.revealed.value;
  const partialRevealText = game.partialRevealText.value;

  const totalChances = steps.length;
  const chancesLeft = useMemo(
    () => Math.max(0, steps.length - guessCount),
    [steps.length, guessCount]
  );
  const isOutOfChances = useMemo(
    () => !won && guessCount >= steps.length,
    [won, guessCount, steps.length]
  );
  const revealReady = useMemo(
    () => !won && guessCount >= revealThreshold(steps.length),
    [won, guessCount, steps.length]
  );
  const currentHint = useMemo(() => {
    const idx = Math.min(guessCount, steps.length - 1);
    return steps[idx]?.hint ?? "";
  }, [guessCount, steps]);

  if (!target) return null;

  // Win screen
  if (won) {
    return (
      <div style={s.root}>
        <Confetti />
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: "2rem" }}>🎉</div>
          <p
            style={{ fontWeight: 700, fontSize: "1.1rem", margin: "8px 0 4px" }}
          >
            You found it!
          </p>
          <p style={{ opacity: 0.7, margin: 0 }}>
            {bookDisplayName(target.bookId)} {target.chapterNumber}:
            {target.verseNumber}
          </p>
          {target.verseText && (
            <p
              style={{
                fontStyle: "italic",
                opacity: 0.8,
                fontSize: "0.9rem",
                margin: "8px 0 0",
              }}
            >
              &ldquo;{target.verseText}&rdquo;
            </p>
          )}
          {guessCount > 0 && (
            <p style={{ opacity: 0.6, fontSize: "0.85rem", margin: "4px 0 0" }}>
              {guessCount} {guessCount === 1 ? "guess" : "guesses"}
            </p>
          )}
        </div>
        <button
          type="button"
          style={{ ...s.btn(true), width: "100%" }}
          onClick={onReset}
        >
          Back to main menu
        </button>
      </div>
    );
  }

  async function handleRevealVerse() {
    if (!target) return;
    game.revealed.value = true;
    await state.app.selectedTab.value?.readingState.selectChapter(
      target.bookId,
      target.chapterNumber
    );
  }

  return (
    <div style={s.root}>
      {/* Chance counter */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {isOutOfChances ? (
          <span style={s.pill("var(--sb-danger-color, #e63946)")}>
            Out of chances
          </span>
        ) : (
          <span style={s.pill("var(--sb-primary-color, #4a6cf7)")}>
            {chancesLeft} / {totalChances} left
          </span>
        )}
        {currentHint && (
          <span
            title={currentHint}
            style={{
              cursor: "help",
              fontSize: "1.1rem",
              opacity: 0.7,
            }}
          >
            💡 <span style={{ fontSize: "0.85rem" }}>{currentHint}</span>
          </span>
        )}
      </div>

      {/* Out-of-chances encouragement */}
      {isOutOfChances && (
        <div style={s.card}>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            You've used all your chances, but you can keep guessing — good luck!
          </p>
        </div>
      )}

      {/* Last guess feedback */}
      {lastResult && (
        <div
          style={{
            ...s.card,
            borderLeft: "3px solid var(--sb-primary-color, #4a6cf7)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            {resultMessage(lastResult)}
          </p>
        </div>
      )}

      {/* Partial reveal */}
      {partialRevealText && !revealed && (
        <div style={s.card}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              opacity: 0.55,
              marginBottom: "4px",
            }}
          >
            PARTIAL HINT
          </div>
          <p style={{ margin: 0, fontSize: "0.9rem", fontStyle: "italic" }}>
            {partialRevealText}
          </p>
        </div>
      )}

      {/* Full reveal */}
      {revealed && (
        <div
          style={{
            ...s.card,
            borderLeft: "3px solid var(--sb-warning-color, #f1a208)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              opacity: 0.55,
              marginBottom: "4px",
            }}
          >
            {bookDisplayName(target.bookId)} {target.chapterNumber}:
            {target.verseNumber}
          </div>
          {target.verseText ? (
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{target.verseText}</p>
          ) : (
            <p style={{ margin: 0, opacity: 0.6, fontSize: "0.9rem" }}>
              Navigate to {bookDisplayName(target.bookId)}{" "}
              {target.chapterNumber}:{target.verseNumber} to read it.
            </p>
          )}
          <p style={{ margin: "8px 0 0", fontSize: "0.85rem", opacity: 0.65 }}>
            Better luck next time — keep going!
          </p>
        </div>
      )}

      {/* Reveal controls */}
      {revealReady && !revealed && (
        <div style={{ display: "flex", gap: "8px" }}>
          {!partialRevealText ? (
            <button
              type="button"
              style={s.btn(false)}
              onClick={() => {
                game.partialRevealText.value = buildPartialReveal(
                  target.verseText
                );
              }}
            >
              Reveal hint
            </button>
          ) : null}
          <button
            type="button"
            style={s.btn(false)}
            onClick={() => void handleRevealVerse()}
          >
            Reveal verse
          </button>
        </div>
      )}

      <p style={{ margin: 0, opacity: 0.5, fontSize: "0.8rem" }}>
        Tap any verse in the reader to guess.
      </p>

      <button
        type="button"
        style={{ ...s.btn(false), alignSelf: "flex-start" }}
        onClick={onReset}
      >
        End game
      </button>
    </div>
  );
}
