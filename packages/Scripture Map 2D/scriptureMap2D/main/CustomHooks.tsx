const { useState, useEffect, useRef, useCallback } = os.appHooks;

export const useResizeObserver = (ref) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
};

interface UseClickAndHoldProps {
  holdTime?: number;
  holdCompleteCallback: (event: PointerEvent) => void;
  holdCancelCallback: (event: PointerEvent) => void;
  dependencies?: any[];
}

export const useClickAndHold: (args: UseClickAndHoldProps) => {
  onHoldStart: (e: PointerEvent) => void;
  onHoldEnd: (e: PointerEvent) => void;
} = ({
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

export const useWhyChanged = (name, value) => {
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      console.log(`[WhyChanged] ${name} changed:`, {
        before: prev.current,
        after: value,
      });
      prev.current = value;
    }
  });
};

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  );

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const listener = (event) => setIsMobile(event.matches);

    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [breakpoint]);

  return isMobile;
}
