import { useMemo } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
import { useI18n } from "seed-bible/i18n";
import { bookDisplayName } from "./books";
import {
  buildPartialReveal,
  resultMessage,
  revealThreshold,
} from "./gameLogic";
import type { GameSignals } from "./types";

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
    background: "var(--sb-tertiary-color, #f0f0f0)",
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
      : "var(--sb-tertiary-color, #f0f0f0)",
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
  const notice = game.notice.value;
  const hintOpenFor = game.hintOpenFor.value;
  const { t } = useI18n("find-the-verse-extension");
  const translationBooks =
    state.app.selectedTab.value?.readingState.translationBooks.value?.books;

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
  const chanceIndex = Math.min(guessCount, Math.max(0, steps.length - 1));
  const currentHint = steps[chanceIndex]?.hint.trim() ?? "";

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
            {t("you-found-it", { defaultValue: "You found it!" })}
          </p>
          <p style={{ opacity: 0.7, margin: 0 }}>
            {bookDisplayName(target.bookId, translationBooks)}{" "}
            {target.chapterNumber}:{target.verseNumber}
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
              {t("guess-count", {
                count: guessCount,
                defaultValue:
                  guessCount === 1 ? "{{count}} guess" : "{{count}} guesses",
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          style={{ ...s.btn(true), width: "100%" }}
          onClick={onReset}
        >
          {t("back-to-menu", { defaultValue: "Back to main menu" })}
        </button>
      </div>
    );
  }

  async function handleRevealVerse() {
    if (!target) return;
    const reading = state.app.selectedTab.value?.readingState;
    if (!reading) return;
    const translationId = reading.translationId.peek();
    const round = game.playRound.peek();
    game.notice.value = null;
    await reading.selectTranslationAndChapter(
      translationId,
      target.bookId,
      target.chapterNumber,
      { scrollToVerse: target.verseNumber }
    );
    // End game and Play both bump the round. A chapter that arrives after
    // that belongs to the round that asked for it.
    if (round !== game.playRound.peek()) return;
    const opened =
      reading.bookId.peek() === target.bookId &&
      reading.chapterNumber.peek() === target.chapterNumber;
    if (!opened || game.phase.peek() !== "playing") {
      if (game.phase.peek() === "playing") {
        game.notice.value = t("open-verse-failed", {
          defaultValue: "Couldn't open that verse.",
        });
      }
      return;
    }
    game.revealed.value = true;
  }

  return (
    <div style={s.root}>
      {/* Chance counter */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {isOutOfChances ? (
          <span style={s.pill("#e63946")}>
            {t("out-of-chances", { defaultValue: "Out of chances" })}
          </span>
        ) : (
          <span style={s.pill("var(--sb-primary-color, #4a6cf7)")}>
            {t("chances-left", {
              left: chancesLeft,
              total: totalChances,
              defaultValue: "{{left}} / {{total}} left",
            })}
          </span>
        )}
        {currentHint ? (
          hintOpenFor === chanceIndex ? (
            <span style={{ fontSize: "0.85rem" }}>{currentHint}</span>
          ) : (
            <button
              type="button"
              title={t("show-hint", { defaultValue: "Show hint" })}
              aria-label={t("show-hint", { defaultValue: "Show hint" })}
              onClick={() => {
                game.hintOpenFor.value = chanceIndex;
              }}
              style={{
                width: "1.6rem",
                height: "1.6rem",
                borderRadius: "99px",
                border:
                  "1px solid var(--sb-divider-color, rgba(0, 0, 0, 0.12))",
                background: "var(--sb-tertiary-color, #f0f0f0)",
                color: "var(--sb-font-color, #333)",
                cursor: "pointer",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              ?
            </button>
          )
        ) : null}
      </div>

      {/* Out-of-chances encouragement */}
      {isOutOfChances && (
        <div style={s.card}>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            {t("keep-guessing", {
              defaultValue:
                "You've used all your chances, but you can keep guessing — good luck!",
            })}
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
            {resultMessage(lastResult, t)}
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
            {t("partial-hint", { defaultValue: "PARTIAL HINT" })}
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
            borderLeft: "3px solid #f1a208",
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
            {bookDisplayName(target.bookId, translationBooks)}{" "}
            {target.chapterNumber}:{target.verseNumber}
          </div>
          {target.verseText ? (
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{target.verseText}</p>
          ) : (
            <p style={{ margin: 0, opacity: 0.6, fontSize: "0.9rem" }}>
              {t("navigate-to-verse", {
                reference: `${bookDisplayName(target.bookId, translationBooks)} ${target.chapterNumber}:${target.verseNumber}`,
                defaultValue: "Navigate to {{reference}} to read it.",
              })}
            </p>
          )}
          <p style={{ margin: "8px 0 0", fontSize: "0.85rem", opacity: 0.65 }}>
            {t("keep-going", {
              defaultValue: "Better luck next time — keep going!",
            })}
          </p>
        </div>
      )}

      {/* Reveal controls */}
      {revealReady && !revealed && (
        <div style={{ display: "flex", gap: "8px" }}>
          {!partialRevealText && target.verseText.trim() ? (
            <button
              type="button"
              style={s.btn(false)}
              onClick={() => {
                game.partialRevealText.value = buildPartialReveal(
                  target.verseText
                );
              }}
            >
              {t("reveal-hint", { defaultValue: "Reveal hint" })}
            </button>
          ) : null}
          <button
            type="button"
            style={s.btn(false)}
            onClick={() => void handleRevealVerse()}
          >
            {t("reveal-verse", { defaultValue: "Reveal verse" })}
          </button>
        </div>
      )}

      {notice && (
        <p
          style={{
            margin: 0,
            color: "#e63946",
            fontSize: "0.9rem",
          }}
        >
          {notice}
        </p>
      )}

      {!revealed && (
        <p style={{ margin: 0, opacity: 0.5, fontSize: "0.8rem" }}>
          {t("tap-to-guess", {
            defaultValue: "Tap any verse in the reader to guess.",
          })}
        </p>
      )}

      <button
        type="button"
        style={{ ...s.btn(false), alignSelf: "flex-start" }}
        onClick={onReset}
      >
        {t("end-game", { defaultValue: "End game" })}
      </button>
    </div>
  );
}
