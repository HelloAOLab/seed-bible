import type { MutableRef } from "../../../../typings/AuxLibraryDefinitions";
const { useEffect } = os.appHooks;

export const useClickOutside = (
  refs: MutableRef<HTMLElement | null>[],
  callback: () => void
) => {
  useEffect(() => {
    const handleOutsideInteraction = (e: MouseEvent | FocusEvent) => {
      const isOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(e.target as Node)
      );
      if (isOutside) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("focusin", handleOutsideInteraction);

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("focusin", handleOutsideInteraction);
    };
  }, [refs, callback]);
};
