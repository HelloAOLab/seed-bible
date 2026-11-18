import "./Dialog.css";
import type { ComponentChildren, JSX, Ref } from "preact";
import { createPortal } from "preact/compat";
import { useCallback, useId, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nContext";
import { CloseButton } from "../CloseButton/CloseButton";
import { useOverlayDismiss } from "../useOverlayDismiss";
import { useModalLayer } from "../useModalFocus";

export interface DialogProps {
  onClose: () => void;
  /** Visible title, which also names the dialog for screen readers. */
  title?: ComponentChildren;
  /** Accessible name, for a dialog without a visible `title`. */
  label?: string;
  /**
   * Whether the user may close it right now (✕, Escape, or clicking outside).
   * False while it is in the middle of something it shouldn't be left in.
   * Defaults to true.
   */
  dismissible?: boolean;
  /** Show the ✕ button. Defaults to true. */
  showClose?: boolean;
  closeLabel?: string;
  /** Rendered below the content, outside its scroll area: usually buttons. */
  footer?: ComponentChildren;
  /** What gets focus on open; defaults to the dialog itself. */
  initialFocusRef?: { current: HTMLElement | null };
  /** Render into `<body>` so no ancestor stacking context can bury it. */
  portal?: boolean;
  className?: string;
  style?: JSX.CSSProperties;
  dialogRef?: Ref<HTMLDivElement>;
  children?: ComponentChildren;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

/**
 * A modal card centered over a dimmed page, for confirmations, forms and
 * anything else that needs an answer before the page can be used again.
 * Focus moves in when it opens and back when it closes, and Tab stays
 * inside. On phones, a picker or a long form may suit a `BottomSheet`
 * better.
 */
export function Dialog(props: DialogProps) {
  const {
    onClose,
    title,
    label,
    dismissible = true,
    showClose = true,
    footer,
    initialFocusRef,
    portal = true,
    className,
    style,
    dialogRef,
    children,
  } = props;
  const { t, isRtl } = useI18n();
  const titleId = useId();
  const dialogEl = useRef<HTMLDivElement | null>(null);
  const setDialogEl = useCallback(
    (el: HTMLDivElement | null) => {
      dialogEl.current = el;
      assignRef(dialogRef, el);
    },
    [dialogRef]
  );
  const close = () => {
    if (dismissible) onClose();
  };
  const overlayDismiss = useOverlayDismiss(close);

  // Escape is taken even when the dialog can't be closed, so it doesn't fall
  // through to whatever is behind.
  useModalLayer(dialogEl, { initialFocusRef, onEscape: close });

  const hasTitle = title !== undefined;
  const dialog = (
    <div className="sb-dialog-backdrop" {...overlayDismiss}>
      <div
        ref={setDialogEl}
        className={`sb-dialog${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-label={hasTitle ? undefined : label}
        // A portaled dialog sits outside the app root that carries `dir`.
        dir={isRtl ? "rtl" : "ltr"}
        tabIndex={-1}
        style={style}
      >
        {(hasTitle || showClose) && (
          <div
            className={`sb-dialog-header${hasTitle ? "" : " sb-dialog-header-untitled"}`}
          >
            {hasTitle && (
              <h2 id={titleId} className="sb-dialog-title">
                {title}
              </h2>
            )}
            {showClose && (
              <CloseButton
                className="sb-dialog-close"
                label={
                  props.closeLabel ?? t("close", { defaultValue: "Close" })
                }
                disabled={!dismissible}
                onClose={close}
              />
            )}
          </div>
        )}
        <div className="sb-dialog-body">{children}</div>
        {footer !== undefined && (
          <div className="sb-dialog-footer">{footer}</div>
        )}
      </div>
    </div>
  );

  if (portal && typeof document !== "undefined") {
    return createPortal(dialog, document.body);
  }
  return dialog;
}
