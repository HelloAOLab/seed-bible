import { useLayoutEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";

interface FormFieldProps {
  /** Empty when the field is fine. A new message, or a new pulse, replays the popup. */
  error: string | null;
  /**
   * Bump this to replay the same message. A second Save click should scroll
   * and zoom again, not only the first time the text appears.
   */
  pulse?: number;
  children: ComponentChildren;
}

const ZOOM_CLASS = "ftv-field-error--zoom";

/**
 * Outer wrapper for one form control. The error message lives here, not on
 * the buttons inside, so a failed check scrolls to the field and the popup
 * zooms twice. Clearing `error` removes it.
 */
export function FormField({ error, pulse = 0, children }: FormFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    const popup = popupRef.current;
    if (!error || !field || !popup) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    // Restarting a CSS animation needs a reflow between removing and adding it.
    popup.classList.remove(ZOOM_CLASS);
    void popup.offsetWidth;
    popup.classList.add(ZOOM_CLASS);
  }, [error, pulse]);

  return (
    <div
      ref={fieldRef}
      aria-invalid={error ? "true" : "false"}
      className={error ? "ftv-field--error" : undefined}
    >
      {children}
      {error ? (
        <p ref={popupRef} role="alert" className="ftv-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
