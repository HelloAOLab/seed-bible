async function handleDateClick({
  info,
  calendarApi,
  experienceConRef,
  setIsEventModalOpen,
  setResourceDate,
  setCurrentResourceId,
  setResorceTime,
  setResourceETime,
  setModalPosition,
  setPlaylistMode,
  setScheduleTitle,
  setScheduleDescription,
  handleAddReadingPlans,
  playlistsToAdd,
  setPlaylistsToAdd,
  setCalendarView,
  setCustomDays,
  setAllEvents,
  setEventInView,
  showEventPopup,
  stripTime,
  getDayDifference,
  dayNameToNumber,
  customDaysRef,
  uuid,
  setRepeat,
  setShowCustomRepeat,
  setSelectedDays,
  selectedDays,
  selectedDaysRef,
  customRepeatRef,
  selectedOption,
  setSelectedOption,
}) {
  // ⛔ ignore clicks inside tippy
  if (info.jsEvent?.target.closest(".tippy-box")) return;

  const date = info.date;
  if (!calendarApi?.current) return;

  /* ================= RESOURCE TIMELINE ================= */
  if (info.view.type === "resourceTimeline") {
    const timeStr = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const endTime = new Date(date);
    endTime.setHours(endTime.getHours() + 1);

    const endStr = endTime.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const container = experienceConRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = info.jsEvent.clientX - rect.left;
    const clickY = info.jsEvent.clientY - rect.top;

    setIsEventModalOpen(true);
    setResourceDate(date.toISOString().split("T")[0]);
    setCurrentResourceId(info?.resource?.id || null);
    setResorceTime(timeStr);
    setResourceETime(endStr);
    setModalPosition({ x: clickX, y: clickY });

    return;
  }

  /* ================= NORMAL CALENDAR ================= */
  if (
    info.view.type === "multiMonthYear" ||
    info.view.type === "resourceTimeline"
  ) {
    return;
  }

  showEventPopup(
    info,
    setPlaylistMode,
    setScheduleTitle,
    setScheduleDescription,
    handleAddReadingPlans,
    calendarApi,
    setCalendarView,
    setCustomDays,
    setRepeat,
    setShowCustomRepeat,
    setSelectedDays,
    customRepeatRef,
    setSelectedOption,
    selectedOption,
    ({
      title,
      description,
      link,
      start,
      end,
      startTime,
      endTime,
      recurVal,
      isPlansTabActive,
    }) => {
      console.log(selectedDaysRef.current, "selectedDaysref");
      console.log(recurVal, "recurVal");
      if (isPlansTabActive) return;

      let newEvent;
      const days = getDayDifference(start, end);
      const now = stripTime(new Date());

      /* ========== NON-RECURRING ========== */
      if (recurVal.charAt(0) === "N") {
        const isTimed = Boolean(startTime && endTime);

        if (days === 0) {
          newEvent = {
            title: title || "easter",
            id: uuid(),
            start: `${start}T${startTime || "09:00"}`,
            end: `${end}T${endTime || "19:00"}`,
            allDay: false,
            color: "white",
            eventDisplay: "list-item",
            theme: "simple-borderless",
            classNames: ["user-event"],
            extendedProps: {
              description,
              link,
              startTime,
              endTime,
              isReapeating: false,
              type: "events",
            },
          };
        } else {
          newEvent = {
            title: title || "easter",
            id: uuid(),
            start: isTimed ? `${start}T${startTime}:00` : start,
            end: isTimed ? `${end}T${endTime}:00` : end,
            allDay: !isTimed,
            color: "white",
            theme: "simple-borderless",
            classNames: ["user-event"],
            extendedProps: {
              description,
              link,
              startTime,
              endTime,
              isReapeating: false,
              type: "events",
            },
          };
        }
      } else if (recurVal.charAt(0) === "R") {
        /* ========== WEEKLY RECURRING ========== */
        const isTimed = startTime && endTime;
        const day = dayNameToNumber(recurVal.split(" ")[2]);

        newEvent = {
          title: title || "easter",
          id: uuid(),
          start: isTimed ? `${start}T${startTime}:00` : start,
          end: isTimed ? `${end}T${endTime}:00` : end,
          daysOfWeek: [day],
          allDay: !isTimed,
          color: "white",
          theme: "simple-borderless",
          classNames: ["user-event"],
          extendedProps: {
            description,
            link,
            startTime,
            endTime,
            isReapeating: true,
            type: "events",
          },
        };
        console.log(newEvent, "newEvent");
      } else if (recurVal.charAt(0) === "c") {
        /* ========== CUSTOM DAYS ========== */
        newEvent = {
          title: title || "easter",
          id: uuid(),
          daysOfWeek: selectedDaysRef.current,
          start,
          end,
          allDay: true,
          color: "white",
          theme: "simple-borderless",
          classNames: ["user-event"],
          extendedProps: {
            description,
            link,
            isReapeating: true,
            type: "events",
          },
        };
      }

      if (!newEvent) return;

      const startDate = stripTime(new Date(newEvent.start));

      setAllEvents((prev) => [...prev, newEvent]);

      if (startDate >= now) {
        setEventInView((prev) => {
          const combined = [...prev, newEvent];
          combined.sort((a, b) => new Date(a.start) - new Date(b.start));
          return combined;
        });
      }

      calendarApi.current.addEvent(newEvent);
    }
  );
}
return handleDateClick;
