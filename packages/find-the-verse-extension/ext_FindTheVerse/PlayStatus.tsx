import { IconButton } from "seed-bible/components";
import type { GameStep } from "./types";

export function chanceView(steps: readonly GameStep[], guessCount: number) {
  const total = steps.length;
  const chancesLeft = Math.max(0, total - guessCount);
  const chanceIndex = Math.min(guessCount, Math.max(0, total - 1));
  const currentHint = steps[chanceIndex]?.hint.trim() ?? "";
  return {
    total,
    chancesLeft,
    chanceIndex,
    currentHint,
    outOfChances: guessCount >= total,
  };
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function GameName({ name }: { name: string }) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return <p className="ftv-game-name">{trimmed}</p>;
}

/** The ? button, or the hint text once it is open. Shared by the panel and the bar. */
export function HintControl({
  hint,
  open,
  onShow,
  t,
}: {
  hint: string;
  open: boolean;
  onShow: () => void;
  t: Translate;
}) {
  if (!hint) return null;
  if (open) {
    return <span className="ftv-hint-text">{hint}</span>;
  }
  const label = t("show-hint", {
    defaultValue: "Show hint",
    ns: "find-the-verse-extension",
  });
  return (
    <IconButton
      className="ftv-hint-button"
      size="sm"
      look="tinted"
      icon="question_mark"
      label={label}
      onClick={onShow}
    />
  );
}
