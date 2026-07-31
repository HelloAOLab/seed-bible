const { useEffect, useRef } = os.appHooks;

function useDayGridResponsiveLayout(containerRef, calendarApi) {
  const lastModeRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !calendarApi?.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const mode = width < 470 ? "compact" : "normal";
      if (lastModeRef.current === mode) return;
      lastModeRef.current = mode;

      const dayEvents = container.querySelectorAll(".fc-daygrid-day-events");
      const moreBtns = container.querySelectorAll(".fc-more-link");

      dayEvents.forEach((el) => {
        el.style.display = "flex";
        el.style.flexDirection = mode === "compact" ? "row" : "column";
        el.style.flexWrap = mode === "compact" ? "wrap" : "nowrap";
      });

      moreBtns.forEach((el) => {
        el.style.display = "block";
        el.style.marginTop = "10px";
      });

      requestAnimationFrame(() => {
        calendarApi.current?.updateSize();
      });
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, calendarApi]);
}
function useTodayButtonResponsiveLabel(containerRef) {
  const lastLabelRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const nextLabel = width < 550 ? "T" : "Today";

      // 🔑 Guard against unnecessary DOM updates
      if (lastLabelRef.current === nextLabel) return;
      lastLabelRef.current = nextLabel;

      const todayBtn = container.querySelector(".fc-today-button");
      if (todayBtn) {
        todayBtn.textContent = nextLabel;
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef]);
}
return { useDayGridResponsiveLayout, useTodayButtonResponsiveLabel };
