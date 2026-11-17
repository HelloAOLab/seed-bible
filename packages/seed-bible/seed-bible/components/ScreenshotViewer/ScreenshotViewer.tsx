import "./ScreenshotViewer.css";
import { createPortal } from "preact/compat";
import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import { CloseButton } from "../CloseButton/CloseButton";
import { IconButton } from "../IconButton/IconButton";
import { useOverlayDismiss } from "../useOverlayDismiss";
import { trapTabKey, useModalFocus } from "../useModalFocus";

const SWIPE_MIN_PX = 40;

export interface Screenshot {
  src: string;
  /** Translated display text, rather than a translation key. */
  caption?: string;
  accessibleName: string;
}

export interface ScreenshotViewerProps {
  screenshots: readonly Screenshot[];
  initialIndex?: number;
  onClose: () => void;
  onImageError?: (src: string) => void;
  className?: string;
}

export function ScreenshotViewer({
  screenshots,
  initialIndex = 0,
  onClose,
  onImageError,
  className,
}: ScreenshotViewerProps) {
  const { t, isRtl } = useI18n();
  const navigationVersion = useSignal(0);
  const lastShown = useRef({
    index: initialIndex,
    src: screenshots[initialIndex]?.src,
  });
  const selected = lastShown.current.index;
  void navigationVersion.value;
  const found = screenshots.findIndex(
    (shot) => shot.src === lastShown.current.src
  );
  const index =
    screenshots[selected]?.src === lastShown.current.src
      ? selected
      : found >= 0
        ? found
        : Math.min(lastShown.current.index, screenshots.length - 1);
  lastShown.current = { index, src: screenshots[index]?.src };
  const screenshot = screenshots[index];
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const overlayDismiss = useOverlayDismiss(onClose);

  useModalFocus(dialog, closeButton, true, true);

  const move = (step: number) => {
    const next = screenshots[index + step];
    if (next) {
      const nextIndex = index + step;
      if (
        (nextIndex === 0 &&
          document.activeElement === previousButton.current) ||
        (nextIndex === screenshots.length - 1 &&
          document.activeElement === nextButton.current)
      ) {
        closeButton.current?.focus();
      }
      lastShown.current = { index: nextIndex, src: next.src };
      navigationVersion.value += 1;
    }
  };

  const moveVisually = (towardRight: boolean) =>
    move(towardRight !== isRtl ? 1 : -1);

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        onClose();
        break;
      case "ArrowLeft":
      case "ArrowRight":
        event.preventDefault();
        event.stopPropagation();
        moveVisually(event.key === "ArrowRight");
        break;
      case "Tab": {
        const container = dialog.current;
        if (container) trapTabKey(event, container);
        break;
      }
    }
  };

  if (!screenshot || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialog}
      className={`sb-screenshot-viewer${className ? ` ${className}` : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={t("extension-screenshots")}
      dir={isRtl ? "rtl" : "ltr"}
      onKeyDown={onKeyDown}
      {...overlayDismiss}
    >
      <div className="sb-screenshot-viewer-controls">
        <span aria-live="polite" aria-atomic="true">
          {t("screenshot-position", {
            current: index + 1,
            total: screenshots.length,
          })}
        </span>
        <CloseButton
          buttonRef={closeButton}
          size="lg"
          label={t("screenshot-close")}
          onClose={onClose}
        />
      </div>
      <img
        className="sb-screenshot-viewer-image"
        src={screenshot.src}
        alt={screenshot.accessibleName}
        onError={() => onImageError?.(screenshot.src)}
        onPointerDown={(event) => {
          if (event.isPrimary === false || event.button > 0) return;
          pointer.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerUp={(event) => {
          const start = pointer.current;
          if (!start || start.id !== event.pointerId) return;
          pointer.current = null;
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
            moveVisually(dx < 0);
          }
        }}
        onPointerCancel={() => (pointer.current = null)}
        draggable={false}
      />
      <div className="sb-screenshot-viewer-footer">
        {screenshots.length > 1 && (
          <IconButton
            buttonRef={previousButton}
            icon={isRtl ? "chevron_right" : "chevron_left"}
            size="lg"
            label={t("screenshot-previous")}
            disabled={index === 0}
            onClick={() => move(-1)}
          />
        )}
        <div className="sb-screenshot-viewer-caption">{screenshot.caption}</div>
        {screenshots.length > 1 && (
          <IconButton
            buttonRef={nextButton}
            icon={isRtl ? "chevron_left" : "chevron_right"}
            size="lg"
            label={t("screenshot-next")}
            disabled={index === screenshots.length - 1}
            onClick={() => move(1)}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
