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

export const useClickAndHold = ({
  holdTime = 1,
  holdCompleteCallback,
  holdCancelCallback,
  dependencies = [],
}) => {
  const timeoutRef = useRef(null);

  const clear = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const onHoldComplete = useCallback((e) => {
    holdCompleteCallback(e);
    clear();
  }, dependencies);

  const onHoldStart = useCallback((e) => {
    timeoutRef.current = setTimeout(() => {
      onHoldComplete(e);
    }, holdTime);
  }, dependencies);

  const onHoldEnd = useCallback((e) => {
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
