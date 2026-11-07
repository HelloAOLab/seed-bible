import type { SeedBibleState } from "seed-bible";
import { useI18n } from "seed-bible/i18n";
import { formatReference } from "./books";
import { resultMessage, revealThreshold } from "./gameLogic";
import { revealHint, revealVerse } from "./roundActions";
import { roundReading } from "./roundTab";
import type { GameSignals } from "./types";
import { chanceView, GameName, HintControl } from "./PlayStatus";
import { SoundToggle } from "./SoundToggle";

interface GamePlayerProps {
  game: GameSignals;
  state: SeedBibleState;
  onReset: () => void;
}

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
  const translationBooks = (
    roundReading(state, game) ?? state.app.selectedTab.value?.readingState
  )?.translationBooks.value?.books;

  const totalChances = steps.length;
  const { chancesLeft, chanceIndex, currentHint, outOfChances } = chanceView(
    steps,
    guessCount
  );
  const showOutOfChances = !won && outOfChances;
  const revealReady = !won && guessCount >= revealThreshold(steps.length);
  const gameName = game.name.value.trim();

  if (!target) return null;

  const reference = formatReference(
    target.bookId,
    target.chapterNumber,
    target.verseNumber,
    translationBooks
  );

  if (won) {
    return (
      <div className="ftv-player">
        <div className="ftv-win">
          <div className="ftv-win-emoji" aria-hidden="true">
            🎉
          </div>
          <p className="ftv-win-title">
            {t("you-found-it", { defaultValue: "You found it!" })}
          </p>
          <p className="ftv-win-reference">{reference}</p>
          {target.verseText && (
            <p className="ftv-win-verse">&ldquo;{target.verseText}&rdquo;</p>
          )}
          {guessCount > 0 && (
            <p className="ftv-win-guesses">
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
          className="ftv-btn ftv-btn--primary ftv-btn--block"
          onClick={onReset}
        >
          {t("back-to-menu", { defaultValue: "Back to games" })}
        </button>
        <SoundToggle t={t} className="ftv-btn ftv-sound-toggle" />
      </div>
    );
  }

  return (
    <div className="ftv-player">
      <GameName name={gameName} />
      <div className="ftv-chance-row">
        {showOutOfChances ? (
          <span className="ftv-pill ftv-pill--spent">
            {t("out-of-chances", { defaultValue: "Out of chances" })}
          </span>
        ) : (
          <span className="ftv-pill">
            {t("chances-left", {
              left: chancesLeft,
              total: totalChances,
              defaultValue: "{{left}} / {{total}} left",
            })}
          </span>
        )}
        <HintControl
          hint={currentHint}
          open={hintOpenFor === chanceIndex}
          onShow={() => {
            game.hintOpenFor.value = chanceIndex;
          }}
          t={t}
        />
      </div>

      {showOutOfChances && (
        <div className="ftv-card">
          <p className="ftv-card-text">
            {t("keep-guessing", {
              defaultValue:
                "You've used all your chances, but you can keep guessing — good luck!",
            })}
          </p>
        </div>
      )}

      {lastResult && (
        <div className="ftv-card ftv-card--result">
          <p className="ftv-card-text">{resultMessage(lastResult, t)}</p>
        </div>
      )}

      {partialRevealText && !revealed && (
        <div className="ftv-card">
          <div className="ftv-card-label">
            {t("partial-hint", { defaultValue: "PARTIAL HINT" })}
          </div>
          <p className="ftv-card-text ftv-card-text--italic">
            {partialRevealText}
          </p>
        </div>
      )}

      {revealed && (
        <div className="ftv-card ftv-card--revealed">
          <div className="ftv-card-label">{reference}</div>
          {target.verseText ? (
            <p className="ftv-card-text">{target.verseText}</p>
          ) : (
            <p className="ftv-card-text ftv-card-text--faint">
              {t("navigate-to-verse", {
                reference,
                defaultValue: "Navigate to {{reference}} to read it.",
              })}
            </p>
          )}
          <p className="ftv-card-footnote">
            {t("keep-going", {
              defaultValue: "Better luck next time — keep going!",
            })}
          </p>
        </div>
      )}

      {revealReady && !revealed && (
        <div className="ftv-reveal-row">
          {!partialRevealText && target.verseText.trim() ? (
            <button
              type="button"
              className="ftv-btn"
              onClick={() => revealHint(game)}
            >
              {t("reveal-hint", { defaultValue: "Reveal hint" })}
            </button>
          ) : null}
          <button
            type="button"
            className="ftv-btn"
            onClick={() =>
              void revealVerse(
                state,
                game,
                t("open-verse-failed", {
                  defaultValue: "Couldn't open that verse.",
                })
              )
            }
          >
            {t("reveal-verse", { defaultValue: "Reveal verse" })}
          </button>
        </div>
      )}

      {notice && <p className="ftv-notice">{notice}</p>}

      {!revealed && (
        <p className="ftv-tap-hint">
          {t("tap-to-guess", {
            defaultValue: "Tap any verse in the reader to guess.",
          })}
        </p>
      )}

      <button
        type="button"
        className="ftv-btn ftv-btn--start"
        onClick={onReset}
      >
        {t("end-game", { defaultValue: "End game" })}
      </button>
      <SoundToggle t={t} className="ftv-btn ftv-btn--start ftv-sound-toggle" />
    </div>
  );
}
