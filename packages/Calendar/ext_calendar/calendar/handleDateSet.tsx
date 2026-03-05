function handleDatesSet({
  info,
  calendarApi,
  calendarRef,
  resourcesRef,
  onRangeChange,
  setEventInView,
  setCalendarTitle,
  setCalendarView,
  updateCalendarHeader,
  toolbarClickHandler,
  setModalOpen,
  activeToolbarHandlerRef,
}: any) {
  const startDate = new Date(info.startStr).toLocaleDateString("en-CA");
  const newResources = resourcesRef.current[startDate] || [];
  calendarApi.current.setOption("resources", newResources);
  updateCalendarHeader(calendarApi.current);
  const { start, end } = info;
  setCalendarTitle(info.view.title);
  setCalendarView(calendarApi.current.view.type);
  const todayBtn = calendarRef.current.querySelector(".fc-today-button");
  const addButton = document.getElementById("add-event-button");
  const prevBtn = calendarRef.current.querySelector(".fc-prev-button");
  const nextBtn = calendarRef.current.querySelector(".fc-next-button");
  let select = document.getElementById("view-toggle-select");
  const calendarap = info.view.calendar;

  if (info.view.type === "multiMonthYear") {
    const year = info.start.getFullYear();
    calendarap.setOption("titleFormat", { year: "numeric" });

    calendarap.setOption("title", year.toString());
  } else {
    if (info.view.type === "timeGridWeek") {
      calendarap.setOption("titleFormat", {
        year: "numeric",
        month: "short",
      });
    } else {
      calendarap.setOption("titleFormat", {
        year: "numeric",
        month: "long",
      });
    }
  }
  if (info.view.type === "resourceTimelineDay") {
    if (todayBtn) todayBtn.style.display = "none";
    if (addButton) addButton.style.display = "none";
    if (select) select.style.display = "none";

    if (prevBtn) {
      prevBtn.onclick = (e: any) => e.preventDefault();
      prevBtn.style.pointerEvents = "none";
    }
    if (nextBtn) {
      nextBtn.onclick = (e) => e.preventDefault();
      nextBtn.style.pointerEvents = "none";
    }
  } else {
    calendarApi.current.setOption("validRange", null);

    if (addButton) addButton.style.display = "inline-block";
    if (select) select.style.display = "inline-block";

    if (prevBtn) prevBtn.style.pointerEvents = "auto";
    if (nextBtn) nextBtn.style.pointerEvents = "auto";
  }

  const events = onRangeChange(start, end);
  const sortedEvents = events.sort(
    (a: any, b: any) => new Date(a.start) - new Date(b.start)
  );
  setEventInView(sortedEvents);

  const styleButtons = () => {
    if (prevBtn) {
      Object.assign(prevBtn.style, {
        backgroundColor: "var(--pageBackground)",
        color: "var(--pageTextColor)",
        fontSize: "10px",
        fontWeight: "700",
        padding: "0",
        border: "none",
        marginRight: "10px",

        alignSelf: "center",
        cursor:
          info.view.type === "resourceTimelineDay" ? "not-allowed" : "pointer",
        opacity: info.view.type === "resourceTimelineDay" ? "0.5" : "1",
      });
      prevBtn.onfocus = prevBtn.onmousedown = () => {
        prevBtn.style.outline = "none";
        prevBtn.style.boxShadow = "none";
      };
    }

    if (nextBtn) {
      Object.assign(nextBtn.style, {
        backgroundColor: "var(--pageBackground)",
        color: "var(--pageTextColor)",
        fontSize: "10px",
        padding: "0",
        border: "none",
        fontWeight: "900",

        marginRight: "10px",
        cursor:
          info.view.type === "resourceTimelineDay" ? "not-allowed" : "pointer",
        opacity: info.view.type === "resourceTimelineDay" ? "0.5" : "1",
      });
      nextBtn.onfocus = nextBtn.onmousedown = () => {
        nextBtn.style.outline = "none";
        nextBtn.style.boxShadow = "none";
      };
    }

    if (todayBtn) {
      if (info.view.type.includes("resourceTimeline")) {
        todayBtn.style.display = "none";
      } else {
        todayBtn.style.display = "inline-block";
        Object.assign(todayBtn.style, {
          backgroundColor: "var(--pageBackground)",
          textTransform: "capitalize",
          color: "var(--pageTextColor)",
          fontWeight: "500",
          fontSize: "12px",
          marginRight: "10px",
          border: "1px solid #d3d3d3",
          padding: "4px 16px",
          cursor: "pointer",
          fontFamily: '"Inter", sans-serif',
        });
        todayBtn.onfocus = todayBtn.onmousedown = () => {
          todayBtn.style.outline = "none";
          todayBtn.style.boxShadow = "none";
        };
      }
    }
  };

  const toolbar = calendarRef.current.querySelector(".fc-toolbar");

  if (toolbar) {
    toolbar.style.fontFamily = '"Inter", sans-serif';
    toolbar.style.fontSize = "medium";
    toolbar.style.fontWeight = "400";

    if (activeToolbarHandlerRef.current) {
      toolbar.removeEventListener("click", activeToolbarHandlerRef.current);
    }

    if (info.view.type.includes("resourceTimeline")) {
      activeToolbarHandlerRef.current = toolbarClickHandler;
      console.log("yeees");
    } else {
      activeToolbarHandlerRef.current = toolbarClickHandler;
    }

    toolbar.addEventListener("click", activeToolbarHandlerRef.current);
  }

  const rightHeaderEl = calendarRef.current.querySelector(
    ".fc-header-toolbar .fc-toolbar-chunk:last-child"
  );

  if (rightHeaderEl) {
    Object.assign(rightHeaderEl.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
    });

    let addButton = document.getElementById("add-event-button");
    if (info.view.type.includes("resourceTimeline")) {
      addButton.style.display = "none";
    } else {
      if (!addButton) {
        addButton = document.createElement("button");
        addButton.id = "add-event-button";
        addButton.innerHTML = `
                
          
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
               xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
            <path d="M9.95441 4.16602V15.8327" stroke="white" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.12109 10H15.738" stroke="white" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Add Event</span> `;
        Object.assign(addButton.style, {
          display: "block",

          backgroundColor: "#D36433",
          color: "white",
          fontSize: "12px",
          transform: "translateX(10px)",
          fontFamily: '"Inter",sans-serif',
          fontWeight: "500",
          width: "100%",
          border: "none",
          borderRadius: "4px",
          padding: "5px 7px",
          cursor: "pointer",
        });

        addButton.addEventListener("click", () => setModalOpen(true));
      }
      rightHeaderEl.appendChild(addButton);
    }

    if (info.view.type.includes("resourceTimeline")) {
      select.style.display = "none";
    } else {
      if (!select) {
        select = document.createElement("select");
        select.id = "view-toggle-select";
        Object.assign(select.style, {
          padding: "5px 7px",
          fontSize: "12px",
          fontFamily: '"Inter", sans-serif',
          fontWeight: "500",
          backgroundColor: "var(--pageBackground)",
          color: "var(--pageTextColor)",
          border: "1px solid #d3d3d3",
          borderRadius: "3px",
          cursor: "pointer",
        });

        select.addEventListener("change", (e) => {
          const v = e.target.value;
          if (v) calendarApi.current.changeView(v);
        });
      }

      rightHeaderEl.insertBefore(
        select,
        document.getElementById("add-event-button")
      );
    }

    select.innerHTML = `
        <option value="timeGridDay">Day</option>
        <option value="timeGridWeek">Weekly</option>
        <option value="dayGridMonth">Monthly</option>
        <option value="multiMonthYear">Year</option>
      `;

    if ([...select.options].some((o) => o.value === info.view.type)) {
      select.value = info.view.type;
    } else {
      select.selectedIndex = 0;
    }
  }

  styleButtons();

  const applyResponsiveToCalendarWidth = () => {
    const calendarEl = calendarRef.current;
    if (!calendarEl) return;

    const width = calendarEl.offsetWidth;

    const todayBtn = calendarEl.querySelector(".fc-today-button");
    if (todayBtn && !info.view.type.includes("resourceTimeline")) {
      todayBtn.textContent = width < 500 ? "T" : "Today";
    }

    const viewSelect = document.getElementById("view-toggle-select");
    if (viewSelect) {
      const d = viewSelect.querySelector('option[value="timeGridDay"]');
      const w = viewSelect.querySelector('option[value="timeGridWeek"]');
      const m = viewSelect.querySelector('option[value="dayGridMonth"]');
      const y = viewSelect.querySelector('option[value="multiMonthYear"]');
      if (d) d.text = width < 550 ? "D" : "Daily";
      if (w) w.text = width < 550 ? "W" : "Weekly";
      if (m) m.text = width < 550 ? "M" : "Monthly";
      if (y) y.text = width < 550 ? "Y" : "Yearly";
    }

    const addBtn = document.getElementById("add-event-button");
    if (addBtn && !info.view.type.includes("resourceTimeline")) {
      addBtn.innerHTML = `
             
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M9.95441 4.16602V15.8327" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.12109 10H15.738" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      if (width >= 550) {
        const span = document.createElement("span");
        span.innerText = "Add Event";
        span.style.marginLeft = "4px";
        span.style.display = "inline-block"; // important!
        span.style.transform = "translateY(-2px)";

        addBtn.appendChild(span);
      }
    }
  };

  applyResponsiveToCalendarWidth();

  if (!calendarRef.current._resizeObserverAttached) {
    const ro = new ResizeObserver(applyResponsiveToCalendarWidth);
    ro.observe(calendarRef.current);
    calendarRef.current._resizeObserverAttached = true;
    calendarRef.current._resizeObserver = ro;
  }
}
return handleDatesSet;
