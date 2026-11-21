import type { ReadonlySignal } from "@preact/signals";
import { useI18n } from "../../i18n";
import { Spinner } from "../Spinner/Spinner";
import "./joinSessionModal.css";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
interface JoiningSessionModalProps {
  isJoiningSession: ReadonlySignal<boolean>;
}
export function JoiningSessionModal({
  isJoiningSession,
}: JoiningSessionModalProps) {
  const { t } = useI18n();

  const [mounted, setMounted] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;

    if (!isJoiningSession.value) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;

        const previousElement = previousFocusRef.current;
        previousFocusRef.current = null;

        if (previousElement?.isConnected) {
          previousElement.focus();
        }
      }

      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!wasOpenRef.current) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      wasOpenRef.current = true;
    }

    // Keep focus inside the loading dialog.
    dialog.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        // This dialog has no interactive controls.
        // Keep focus on the dialog instead of allowing Tab to reach the app.
        event.preventDefault();
        event.stopPropagation();
        dialog.focus();
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        !dialog.contains(event.target as Node)
      ) {
        event.preventDefault();
        event.stopPropagation();
        dialog.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) {
        dialog.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, [mounted, isJoiningSession.value]);

  if (!mounted || !isJoiningSession.value) {
    return null;
  }

  return (
    <div
      className="sb-joining-session-overlay"
      role="dialog"
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="sb-joining-session-title"
      aria-describedby="sb-joining-session-description"
      tabIndex={-1}
    >
      <div className="sb-joining-session-modal">
        <Spinner />

        <h3 id="sb-joining-session-title">
          {t("joining-session", {
            defaultValue: "Joining session…",
          })}
        </h3>

        <p id="sb-joining-session-description" role="status" aria-live="polite">
          {t("joining-session-description", {
            defaultValue:
              "Please wait while we connect you to the shared session.",
          })}
        </p>
      </div>
    </div>
  );
}
