import { useRef } from "preact/hooks";

/**
 * Handlers to spread onto a modal's backdrop so clicking it calls `onClose`.
 *
 * A drag that starts inside the modal (e.g. selecting text in an input) and is
 * released over the backdrop still fires `click` on the backdrop, so this only
 * closes when the press also started on the backdrop itself.
 */
export function useOverlayDismiss(onClose: () => void) {
  const pressStartedOnOverlay = useRef(false);

  return {
    onMouseDown: (event: MouseEvent) => {
      pressStartedOnOverlay.current = event.target === event.currentTarget;
    },
    onClick: (event: MouseEvent) => {
      const shouldClose =
        pressStartedOnOverlay.current && event.target === event.currentTarget;
      pressStartedOnOverlay.current = false;
      if (shouldClose) {
        onClose();
      }
    },
  };
}
