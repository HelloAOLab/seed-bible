const { useState, useEffect } = os.appHooks;

type useIsMobileType = (breakpoint: number) => boolean;

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
