import { MaterialIcon } from "seed-bible/components";
import { setSoundMuted, soundMuted } from "./winSound";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Turns the victory sound on or off. Remembered on this device. */
export function SoundToggle({
  t,
  className,
}: {
  t: Translate;
  className: string;
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
    <button
      type="button"
      className={className}
      aria-pressed={!muted}
      title={label}
      onClick={() => setSoundMuted(!muted)}
    >
      <MaterialIcon aria-hidden="true">
        {muted ? "volume_off" : "volume_up"}
      </MaterialIcon>
      <span>{label}</span>
    </button>
  );
}
