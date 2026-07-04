import type { MutableRef } from "preact/hooks";

interface ResizeObserverSize {
  width: number;
  height: number;
}

type useResizeObserverType = (ref: MutableRef<Element>) => ResizeObserverSize;

import { useState, useEffect } from "preact/hooks";

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
