import { useRef, type MutableRef } from "preact/hooks";
import { useTodayContext } from "../contexts/today/TodayContext";

export type UseCategorizedBookmarks = () => {
  containerRef: MutableRef<HTMLDivElement | null>;
};

export const useCategorizedBookmarks: UseCategorizedBookmarks = () => {
  const { useHorizontalScroll } = useTodayContext();

  const containerRef = useRef<HTMLDivElement | null>(null);
  useHorizontalScroll(containerRef);

  return {
    containerRef,
  };
};
