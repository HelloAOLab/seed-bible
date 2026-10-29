import { useEffect, useState } from "preact/hooks";
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

interface ToolbarAnchor {
  bottom: number;
  slide: number;
  follow: boolean;
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
  background: "var(--sb-reader-toolbar-background, #fff)",
  color: "var(--sb-reader-toolbar-font-color, #333)",
  border: "var(--sb-reader-toolbar-border, 1px solid rgba(0, 0, 0, 0.14))",
  boxShadow:
    "var(--sb-reader-toolbar-box-shadow, 0 8px 32px rgba(0, 0, 0, 0.12))",
  borderRadius: "1.25rem",
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  transition: "transform 0.3s ease",
};

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

/**
 * On a phone the chapter bar and the tab bar are one piece. Scrolling the
 * chapter slides that piece down by the tab bar's height, and the chapter
 * bar stays. This reports where to pin the banner so it rides along above
 * the chapter bar instead of being covered by it.
 */
function useToolbarAnchor(): ToolbarAnchor | null {
  const [anchor, setAnchor] = useState<ToolbarAnchor | null>(null);

  useEffect(() => {
    const measure = () => {
      const wrap = document.querySelector(".sb-reader-toolbar-wrap");
      if (!(wrap instanceof HTMLElement)) {
        setAnchor(null);
        return;
      }
      if (getComputedStyle(wrap).position !== "fixed") {
        setAnchor(null);
        return;
      }
      const nav = wrap.querySelector(".sb-reader-floating-nav");
      const target = nav instanceof HTMLElement ? nav : wrap;
      const slide = wrap.offsetHeight;
      const translateY = readTranslateY(wrap);
      const settled = translateY < 1 || Math.abs(translateY - slide) < 1;
      const follow = document.body.classList.contains("sb-scroll-hide-bars");
      if (!settled) {
        setAnchor((current) => (current ? { ...current, follow } : current));
        return;
      }
      const restingTop = target.getBoundingClientRect().top - translateY;
      const bottom = Math.max(8, window.innerHeight - restingTop + 8);
      setAnchor((current) => {
        if (
          current &&
          current.bottom === bottom &&
          current.slide === slide &&
          current.follow === follow
        ) {
          return current;
        }
        return { bottom, slide, follow };
      });
    };

    measure();
    const wrap = document.querySelector(".sb-reader-toolbar-wrap");
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (wrap instanceof HTMLElement) {
      observer?.observe(wrap);
      const nav = wrap.querySelector(".sb-reader-floating-nav");
      if (nav instanceof HTMLElement) observer?.observe(nav);
    }
    const classObserver = new MutationObserver(measure);
    classObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      classObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return anchor;
}

/**
 * The phone More menu opens upward from the tab bar, and this strip sits
 * above that bar, so it covers the menu. Hide it while the menu is up.
 * Closing the menu puts the strip back; the round keeps going.
 */
function useMoreMenuOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let menuObserver: MutationObserver | null = null;
    let watched: HTMLElement | null = null;

    const sync = () => {
      const next = document.querySelector(".sb-mobile-more-menu") !== null;
      setOpen((current) => (current === next ? current : next));
    };

    const watchWrap = () => {
      const wrap = document.querySelector(".sb-reader-toolbar-wrap");
      if (!(wrap instanceof HTMLElement)) {
        if (watched) {
          menuObserver?.disconnect();
          watched = null;
          setOpen(false);
        }
        return;
      }
      if (wrap === watched) return;
      menuObserver?.disconnect();
      watched = wrap;
      menuObserver = new MutationObserver(sync);
      menuObserver.observe(wrap, { childList: true, subtree: true });
      sync();
    };

    watchWrap();
    const bodyObserver = new MutationObserver(watchWrap);
    bodyObserver.observe(document.body, { childList: true });
    return () => {
      menuObserver?.disconnect();
      bodyObserver.disconnect();
    };
  }, []);

  return open;
}

const row = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const actionButton = {
  border:
    "1px solid color-mix(in srgb, var(--sb-font-color, #333) 16%, transparent)",
  background: "var(--sb-secondary-color, #f3f3f3)",
  color: "var(--sb-font-color, #333)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.85rem",
  lineHeight: 1.2,
  padding: "8px 14px",
  borderRadius: "0.75rem",
  flexShrink: 0,
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
  const moreMenuOpen = useMoreMenuOpen();
  const anchor = useToolbarAnchor();
  const translate = (key: string, options?: Record<string, unknown>) =>
    state.i18n.t(key, { ...options, ns: NS });
  const placed = anchor
    ? {
        ...strip,
        zIndex: 102,
        bottom: `${anchor.bottom}px`,
        transform: anchor.follow
          ? `translateY(${anchor.slide}px)`
          : "translateY(0)",
      }
    : strip;

  if (paneOpen || moreMenuOpen) return null;

  if (phase === "creating" && selecting) {
    return (
      <div style={placed}>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          {translate("select-verse-banner", {
            defaultValue:
              "Tap any verse in the reader, then choose Set as target in the toolbar.",
          })}
        </p>
        <button type="button" style={actionButton} onClick={onCancelSelect}>
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
      <div style={placed}>
        <div style={row}>
          <p style={{ margin: 0, fontWeight: 700, flex: 1 }}>
            {translate("you-found-it", { defaultValue: "You found it!" })}
          </p>
          <button type="button" style={actionButton} onClick={onEnd}>
            {translate("back-to-menu", { defaultValue: "Back to main menu" })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={placed}>
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
          buttonBackground="var(--sb-secondary-color, #f3f3f3)"
        />
        <button
          type="button"
          style={{ ...actionButton, marginLeft: "auto" }}
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
