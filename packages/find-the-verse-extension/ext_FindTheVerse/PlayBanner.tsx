import type { SeedBibleState } from "seed-bible";
import { resultMessage } from "./gameLogic";
import { chanceView, GameName, HintControl } from "./PlayStatus";
import type { GameSignals } from "./types";

const NS = "find-the-verse-extension";

interface PlayBannerProps {
  game: GameSignals;
  state: SeedBibleState;
  paneId: string;
  onEnd: () => void;
  onCancelSelect: () => void;
}

const strip = {
  position: "fixed" as const,
  zIndex: 90,
  left: "12px",
  right: "12px",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
  maxWidth: "28rem",
  margin: "0 auto",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "var(--sb-tertiary-color, #f0f0f0)",
  color: "var(--sb-font-color, #333)",
  boxShadow: "0 8px 24px var(--sb-shadow-color, rgba(0, 0, 0, 0.18))",
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const row = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const textButton = {
  border: "none",
  background: "transparent",
  color: "var(--sb-font-color, #333)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.85rem",
  padding: "4px 0",
};

/**
 * Shown over the reader while a round is running and the side pane is closed.
 * On a phone the pane covers the reader, so leaving it has to keep the round
 * going. This strip is what tells the player a game is still on.
 */
export function FindTheVerseReaderBanner({
  game,
  state,
  paneId,
  onEnd,
  onCancelSelect,
}: PlayBannerProps) {
  const hintOpenFor = game.hintOpenFor.value;
  const phase = game.phase.value;
  const selecting = game.selectingViaToolbar.value;
  const paneOpen = state.panes.panes.value.some((pane) => pane.id === paneId);
  const translate = (key: string, options?: Record<string, unknown>) =>
    state.i18n.t(key, { ...options, ns: NS });

  if (paneOpen) return null;

  if (phase === "creating" && selecting) {
    return (
      <div style={strip}>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          {translate("select-verse-banner", {
            defaultValue:
              "Tap any verse in the reader, then choose Set as target in the toolbar.",
          })}
        </p>
        <button type="button" style={textButton} onClick={onCancelSelect}>
          {translate("cancel", { defaultValue: "Cancel" })}
        </button>
      </div>
    );
  }

  if (phase !== "playing") return null;

  const steps = game.steps.value;
  const guessCount = game.guessCount.value;
  const won = game.won.value;
  const revealed = game.revealed.value;
  const lastResult = game.lastResult.value;
  const { chancesLeft, chanceIndex, currentHint, outOfChances } = chanceView(
    steps,
    guessCount
  );
  const gameName = game.name.value;

  if (won) {
    return (
      <div style={strip}>
        <p style={{ margin: 0, fontWeight: 700 }}>
          {translate("you-found-it", { defaultValue: "You found it!" })}
        </p>
        <button type="button" style={textButton} onClick={onEnd}>
          {translate("back-to-menu", { defaultValue: "Back to main menu" })}
        </button>
      </div>
    );
  }

  return (
    <div style={strip}>
      <GameName name={gameName} fontSize="0.95rem" />
      <div style={row}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
          {outOfChances
            ? translate("out-of-chances", { defaultValue: "Out of chances" })
            : translate("chances-left", {
                left: chancesLeft,
                total: steps.length,
                defaultValue: "{{left}} / {{total}} left",
              })}
        </span>
        <HintControl
          hint={currentHint}
          open={hintOpenFor === chanceIndex}
          onShow={() => {
            game.hintOpenFor.value = chanceIndex;
          }}
          t={translate}
          buttonBackground="var(--sb-background, #fff)"
        />
        <button
          type="button"
          style={{ ...textButton, marginLeft: "auto" }}
          onClick={onEnd}
        >
          {translate("end-game", { defaultValue: "End game" })}
        </button>
      </div>
      {revealed ? (
        <p style={{ margin: 0, fontSize: "0.85rem" }}>
          {translate("keep-going", {
            defaultValue: "Better luck next time — keep going!",
          })}
        </p>
      ) : (
        lastResult && (
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            {resultMessage(lastResult, translate)}
          </p>
        )
      )}
    </div>
  );
}
