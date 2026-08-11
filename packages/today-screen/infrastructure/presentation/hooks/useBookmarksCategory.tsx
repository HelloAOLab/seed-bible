import { useHorizontalScroll } from "@packages/seed-bible-utils/infrastructure/presentation/hooks/useHorizontalScroll";
import { useRef, type MutableRef } from "preact/hooks";

type UseBookmarksCategory = () => {
  containerRef: MutableRef<HTMLDivElement | null>;
};

export const useBookmarksCategory: UseBookmarksCategory = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Unconditional per Rules of Hooks; a no-op on desktop (no overflow).
  useHorizontalScroll(containerRef);

  return {
    containerRef,
  };
};
