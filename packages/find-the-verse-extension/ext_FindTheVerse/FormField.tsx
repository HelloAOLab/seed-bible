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

const ZOOM = "ftv-error-zoom 0.72s ease";

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
    popup.style.animation = "none";
    void popup.offsetWidth;
    popup.style.animation = ZOOM;
  }, [error, pulse]);

  return (
    <div
      ref={fieldRef}
      aria-invalid={error ? "true" : "false"}
      style={
        error
          ? {
              borderRadius: "8px",
              outline: "2px solid #e63946",
              outlineOffset: "4px",
            }
          : undefined
      }
    >
      <style>{`
        @keyframes ftv-error-zoom {
          0% { transform: scale(0.6); opacity: 0; }
          15% { transform: scale(1.12); opacity: 1; }
          30% { transform: scale(1); opacity: 1; }
          55% { transform: scale(1.12); opacity: 1; }
          75% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {children}
      {error ? (
        <p
          ref={popupRef}
          role="alert"
          style={{
            margin: "8px 0 0",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "var(--sb-background, #fff)",
            color: "#e63946",
            border: "1px solid #e63946",
            fontSize: "0.85rem",
            transformOrigin: "center top",
            boxShadow: "0 8px 20px var(--sb-shadow-color, rgba(0, 0, 0, 0.15))",
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
