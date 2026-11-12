import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
import { resultMessage, revealThreshold } from "./gameLogic";
import { chanceView, GameName, HintControl } from "./PlayStatus";
import { revealHint, revealVerse } from "./roundActions";
import { isRoundTabSelected, roundReading } from "./roundTab";
import type { GameSignals } from "./types";
import type WinCelebrationComponent from "./WinCelebration";

const NS = "find-the-verse-extension";

interface PlayBannerProps {
  game: GameSignals;
  state: SeedBibleState;
  paneId: string;
  onEnd: () => void;
  onCancelSelect: () => void;
}

interface ToolbarAnchor {
  bottom: number;
  slide: number;
  follow: boolean;
}

interface ReaderChrome {
  anchor: ToolbarAnchor | null;
  moreMenuOpen: boolean;
}

/** Same slide the reader toolbar uses when a phone scrolls the chapter. */
function readTranslateY(el: HTMLElement): number {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return 0;
  try {
    return new DOMMatrix(transform).m42;
  } catch {
    return 0;
  }
}

function sameAnchor(a: ToolbarAnchor | null, b: ToolbarAnchor | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.bottom === b.bottom && a.slide === b.slide && a.follow === b.follow;
}

/**
 * Watches the reader's toolbar for the bar, and only while the bar is up.
 *
 * On a phone the chapter bar and the tab bar are one piece. Scrolling the
 * chapter slides that piece down by the tab bar's height, and the chapter bar
 * stays. `anchor` is where to pin the bar so it rides along above the chapter
 * bar instead of being covered by it.
 *
 * The phone More menu opens upward from the tab bar and would be covered by
 * the bar, so `moreMenuOpen` hides it while the menu is up.
 *
 * The toolbar can be replaced at any depth, so this watches all of `<body>`
 * and re-attaches its size watcher to whichever toolbar is there now.
 */
function useReaderChrome(): ReaderChrome {
  const [chrome, setChrome] = useState<ReaderChrome>({
    anchor: null,
    moreMenuOpen: false,
  });

  useEffect(() => {
    let watchedWrap: HTMLElement | null = null;
    let watchedNav: HTMLElement | null = null;
    const sizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => update())
        : null;

    const watchSize = (wrap: HTMLElement | null, nav: HTMLElement | null) => {
      if (wrap === watchedWrap && nav === watchedNav) return;
      sizeObserver?.disconnect();
      watchedWrap = wrap;
      watchedNav = nav;
      if (wrap) sizeObserver?.observe(wrap);
      if (nav) sizeObserver?.observe(nav);
    };

    const measure = (
      wrap: HTMLElement | null,
      nav: HTMLElement | null,
      current: ToolbarAnchor | null
    ): ToolbarAnchor | null => {
      if (!wrap || getComputedStyle(wrap).position !== "fixed") return null;
      const target = nav ?? wrap;
      const slide = wrap.offsetHeight;
      const translateY = readTranslateY(wrap);
      const settled = translateY < 1 || Math.abs(translateY - slide) < 1;
      const follow = document.body.classList.contains("sb-scroll-hide-bars");
      // Mid-slide the position is in motion. Keep the last one.
      if (!settled) return current ? { ...current, follow } : current;
      const restingTop = target.getBoundingClientRect().top - translateY;
      const bottom = Math.max(8, window.innerHeight - restingTop + 8);
      return { bottom, slide, follow };
    };

    function update() {
      const found = document.querySelector(".sb-reader-toolbar-wrap");
      const wrap = found instanceof HTMLElement ? found : null;
      const foundNav = wrap?.querySelector(".sb-reader-floating-nav");
      const nav = foundNav instanceof HTMLElement ? foundNav : null;
      watchSize(wrap, nav);
      const moreMenuOpen = document.querySelector(".sb-more-menu") !== null;
      setChrome((current) => {
        const anchor = measure(wrap, nav, current.anchor);
        if (
          current.moreMenuOpen === moreMenuOpen &&
          sameAnchor(current.anchor, anchor)
        ) {
          return current;
        }
        return { anchor, moreMenuOpen };
      });
    }

    update();
    const bodyObserver = new MutationObserver(update);
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("resize", update);
    return () => {
      sizeObserver?.disconnect();
      bodyObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return chrome;
}

/** Only mounted while there is something to show, so its watchers are too. */
function PlacedBar({ children }: { children: ComponentChildren }) {
  const { anchor, moreMenuOpen } = useReaderChrome();
  if (moreMenuOpen) return null;
  const style = anchor
    ? {
        zIndex: "calc(var(--sb-layer-chrome) + 2)",
        bottom: `${anchor.bottom}px`,
        transform: anchor.follow
          ? `translateY(${anchor.slide}px)`
          : "translateY(0)",
      }
    : undefined;
  return (
    <div className="ftv-bar" style={style}>
      {children}
    </div>
  );
}

function RoundBar({
  game,
  state,
  onEnd,
  translate,
}: {
  game: GameSignals;
  state: SeedBibleState;
  onEnd: () => void;
  translate: (key: string, options?: Record<string, unknown>) => string;
}) {
  const steps = game.steps.value;
  const guessCount = game.guessCount.value;
  const won = game.won.value;
  const revealed = game.revealed.value;
  const lastResult = game.lastResult.value;
  const partialRevealText = game.partialRevealText.value;
  const notice = game.notice.value;
  const hintOpenFor = game.hintOpenFor.value;
  const target = game.targetVerse.value;
  const roundTabId = game.roundTabId.value;
  const onRoundTab = isRoundTabSelected(state, game);
  const { chancesLeft, chanceIndex, currentHint, outOfChances } = chanceView(
    steps,
    guessCount
  );
  const revealReady = !won && guessCount >= revealThreshold(steps.length);

  if (won) {
    return (
      <div className="ftv-bar-row">
        <p className="ftv-bar-title">
          {translate("you-found-it", { defaultValue: "You found it!" })}
        </p>
        <button type="button" className="ftv-bar-button" onClick={onEnd}>
          {translate("back-to-menu", { defaultValue: "Back to games" })}
        </button>
      </div>
    );
  }

  return (
    <>
      <GameName name={game.name.value} />
      <div className="ftv-bar-row">
        <span className="ftv-bar-chances">
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
        />
        <button
          type="button"
          className="ftv-bar-button ftv-bar-button--end"
          onClick={onEnd}
        >
          {translate("end-game", { defaultValue: "End game" })}
        </button>
      </div>
      {!onRoundTab && roundTabId ? (
        <div className="ftv-bar-row">
          <p className="ftv-bar-text">
            {translate("game-in-other-tab", {
              defaultValue: "Your game is in another tab.",
            })}
          </p>
          <button
            type="button"
            className="ftv-bar-button"
            onClick={() => state.app.selectTab(roundTabId)}
          >
            {translate("return-to-game", { defaultValue: "Return to game" })}
          </button>
        </div>
      ) : revealed ? (
        <p className="ftv-bar-text">
          {translate("keep-going", {
            defaultValue: "Better luck next time — keep going!",
          })}
        </p>
      ) : (
        lastResult && (
          <p className="ftv-bar-text">{resultMessage(lastResult, translate)}</p>
        )
      )}
      {partialRevealText && !revealed && (
        <p className="ftv-bar-text ftv-bar-text--italic">{partialRevealText}</p>
      )}
      {revealReady && !revealed && (
        <div className="ftv-bar-row">
          {!partialRevealText && target?.verseText.trim() ? (
            <button
              type="button"
              className="ftv-bar-button"
              onClick={() => revealHint(game)}
            >
              {translate("reveal-hint", { defaultValue: "Reveal hint" })}
            </button>
          ) : null}
          <button
            type="button"
            className="ftv-bar-button"
            onClick={() =>
              void revealVerse(
                state,
                game,
                translate("open-verse-failed", {
                  defaultValue: "Couldn't open that verse.",
                })
              )
            }
          >
            {translate("reveal-verse", { defaultValue: "Reveal verse" })}
          </button>
        </div>
      )}
      {notice && <p className="ftv-bar-text ftv-notice">{notice}</p>}
    </>
  );
}

type Celebration = typeof WinCelebrationComponent;

/**
 * The full-screen win moment. Its code and styles are fetched on the first
 * win, not when the extension starts.
 */
function WinMoment({
  game,
  state,
  onEnd,
  translate,
}: {
  game: GameSignals;
  state: SeedBibleState;
  onEnd: () => void;
  translate: (key: string, options?: Record<string, unknown>) => string;
}) {
  const won = game.won.value && game.phase.value === "playing";
  const round = game.playRound.value;
  const target = game.targetVerse.value;
  const [View, setView] = useState<Celebration | null>(null);
  const [dismissedRound, setDismissedRound] = useState<number | null>(null);
  const dismiss = useCallback(() => setDismissedRound(round), [round]);

  useEffect(() => {
    if (!won || View) return;
    let cancelled = false;
    void import("./WinCelebration").then((module) => {
      if (!cancelled) setView(() => module.default);
    });
    return () => {
      cancelled = true;
    };
  }, [won, View]);

  if (!won || !target || !View || dismissedRound === round) return null;
  return (
    <View
      target={target}
      guessCount={game.guessCount.value}
      translationBooks={
        roundReading(state, game)?.translationBooks.value?.books ?? undefined
      }
      t={translate}
      onBack={onEnd}
      onDismiss={dismiss}
    />
  );
}

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
  const phase = game.phase.value;
  const selecting = game.selectingViaToolbar.value;
  const paneOpen = state.panes.panes.value.some((pane) => pane.id === paneId);
  const translate = (key: string, options?: Record<string, unknown>) =>
    state.i18n.t(key, { ...options, ns: NS });

  let bar: ComponentChildren = null;
  if (!paneOpen && phase === "creating" && selecting) {
    bar = (
      <PlacedBar>
        <p className="ftv-bar-text">
          {translate("select-verse-banner", {
            defaultValue:
              "Tap any verse in the reader, then choose Set as target in the toolbar.",
          })}
        </p>
        <button
          type="button"
          className="ftv-bar-button"
          onClick={onCancelSelect}
        >
          {translate("cancel", { defaultValue: "Cancel" })}
        </button>
      </PlacedBar>
    );
  } else if (!paneOpen && phase === "playing") {
    bar = (
      <PlacedBar>
        <RoundBar
          game={game}
          state={state}
          onEnd={onEnd}
          translate={translate}
        />
      </PlacedBar>
    );
  }

  return (
    <>
      {bar}
      <WinMoment
        game={game}
        state={state}
        onEnd={onEnd}
        translate={translate}
      />
    </>
  );
}
