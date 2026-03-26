const { useState, useEffect, useRef, useCallback } = os.appHooks;

interface ResizeObserverSize {
  width: number;
  height: number;
}

type useResizeObserverType = (ref: React.Ref<Element>) => ResizeObserverSize;

interface UseClickAndHoldProps {
  holdTime?: number;
  holdCompleteCallback: (event: PointerEvent) => void;
  holdCancelCallback: (event: PointerEvent) => void;
  dependencies?: any[];
}

type useClickAndHoldType = (params: UseClickAndHoldProps) => {
  onHoldStart: (e: PointerEvent) => void;
  onHoldEnd: (e: PointerEvent) => void;
};

type useWhyChangedType = (name: string, value: unknown) => void;

type useIsMobileType = (breakpoint: number) => boolean;

export const useResizeObserver: useResizeObserverType = (ref) => {
  const [size, setSize] = useState<ResizeObserverSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
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

export const useWhyChanged: useWhyChangedType = (name, value) => {
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

export const useIsMobile: useIsMobileType = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  );

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const listener: (event: MediaQueryListEvent) => void = (event) =>
      setIsMobile(event.matches);

    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [breakpoint]);

  return isMobile;
};
