import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "seed-bible/components";
import { setSoundMuted, soundMuted } from "./winSound";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Turns the victory sound on or off. Remembered on this device. */
export function SoundToggle({
  t,
  className,
  variant = "secondary",
  size = "md",
}: {
  t: Translate;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const muted = soundMuted.value;
  const label = muted
    ? t("sound-off", {
        defaultValue: "Victory sound off",
        ns: "find-the-verse-extension",
      })
    : t("sound-on", {
        defaultValue: "Victory sound on",
        ns: "find-the-verse-extension",
      });
  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      icon={muted ? "volume_off" : "volume_up"}
      aria-pressed={!muted}
      onClick={() => setSoundMuted(!muted)}
    >
      {label}
    </Button>
  );
}
