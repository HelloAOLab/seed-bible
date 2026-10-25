import type { GameStep } from "./types";

export function chanceView(steps: readonly GameStep[], guessCount: number) {
  const total = steps.length;
  const chancesLeft = Math.max(0, total - guessCount);
  const chanceIndex = Math.min(guessCount, Math.max(0, total - 1));
  const currentHint = steps[chanceIndex]?.hint.trim() ?? "";
  return { total, chancesLeft, chanceIndex, currentHint };
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function GameName({
  name,
  fontSize,
}: {
  name: string;
  fontSize: string;
}) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return <p style={{ margin: 0, fontWeight: 700, fontSize }}>{trimmed}</p>;
}

/** The ? button, or the hint text once it is open. Shared by the panel and the bar. */
export function HintControl({
  hint,
  open,
  onShow,
  t,
  buttonBackground,
}: {
  hint: string;
  open: boolean;
  onShow: () => void;
  t: Translate;
  buttonBackground: string;
}) {
  if (!hint) return null;
  if (open) {
    return (
      <span style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
        {hint}
      </span>
    );
  }
  const label = t("show-hint", {
    defaultValue: "Show hint",
    ns: "find-the-verse-extension",
  });
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onShow}
      style={{
        width: "1.6rem",
        height: "1.6rem",
        borderRadius: "99px",
        border: "1px solid var(--sb-divider-color, rgba(0, 0, 0, 0.12))",
        background: buttonBackground,
        color: "var(--sb-font-color, #333)",
        cursor: "pointer",
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      ?
    </button>
  );
}
