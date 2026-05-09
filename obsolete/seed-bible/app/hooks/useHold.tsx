const { useRef, useCallback } = os.appHooks;

export function useHoldAction(
  callback: () => void | Promise<void>,
  holdDuration = 1000
) {
  const timerRef = useRef(null);
  const triggeredRef = useRef(false);

  const startHold = useCallback(() => {
    triggeredRef.current = false;

    timerRef.current = setTimeout(() => {
      const result = callback();

      Promise.resolve(result)
        .then(() => {
          triggeredRef.current = true;
        })
        .catch((err) => {
          console.error("Hold callback error:", err);
        });
    }, holdDuration);
  }, [callback, holdDuration]);

  const cancelHold = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleRelease = useCallback(() => {
    cancelHold();
  }, [cancelHold]);

  const shouldSuppressClick = useCallback(() => triggeredRef.current, []);

  return {
    eventHandlers: {
      onMouseDown: startHold,
      onTouchStart: startHold,
      onMouseUp: handleRelease,
      onMouseLeave: handleRelease,
      onTouchEnd: handleRelease,
      onTouchCancel: handleRelease,
    },
    shouldSuppressClick,
  };
}

export { useHoldAction };
