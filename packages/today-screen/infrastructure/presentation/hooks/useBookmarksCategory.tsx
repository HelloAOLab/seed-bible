import { useHorizontalScroll } from "@packages/seed-bible-utils/infrastructure/presentation/hooks/useHorizontalScroll";
import { useRef, type MutableRef } from "preact/hooks";
import { useTodayContext } from "../contexts/today/TodayContext";

type UseBookmarksCategory = () => {
  containerRef: MutableRef<HTMLDivElement | null>;
};

export const useBookmarksCategory: UseBookmarksCategory = () => {
  const { isMobile } = useTodayContext();

  const containerRef = useRef<HTMLDivElement | null>(null);

  if (isMobile.value) {
    useHorizontalScroll(containerRef);
  }

  return {
    containerRef,
  };
};
