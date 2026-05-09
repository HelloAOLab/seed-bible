const { useRef, useCallback } = os.appHooks;

interface UseClickAndHoldProps {
  holdTime?: number;
  holdCompleteCallback: (event: PointerEvent) => void;
  holdCancelCallback: (event: PointerEvent) => void;
  dependencies?: ReadonlyArray<unknown>;
}

type useClickAndHoldType = <T extends HTMLElement = HTMLElement>(
  params: UseClickAndHoldProps
) => {
  onHoldStart: (e: React.JSX.TargetedPointerEvent<T>) => void;
  onHoldEnd: (e: React.JSX.TargetedPointerEvent<T>) => void;
};

export const useClickAndHold: useClickAndHoldType = ({
  holdTime = 1,
  holdCompleteCallback,
  holdCancelCallback,
  dependencies = [],
}) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const clear = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }, []);

  const onHoldComplete = useCallback((e: PointerEvent) => {
    holdCompleteCallback(e);
    clear();
  }, dependencies);

  const onHoldStart = useCallback((e: PointerEvent) => {
    timeoutRef.current = setTimeout(() => {
      onHoldComplete(e);
    }, holdTime);
  }, dependencies);

  const onHoldEnd = useCallback((e: PointerEvent) => {
    if (timeoutRef.current) {
      holdCancelCallback?.(e);
      clear();
    }
  }, dependencies);

  return { onHoldStart, onHoldEnd };
};
