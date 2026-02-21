const { useSideBarContext } = await import("app.hooks.sideBar");

//imports
const { useRef, useState, useEffect, useCallback } = os.appHooks;
const CustomModal = await thisBot.CustomModal();
const GroupSettingsModal = await thisBot.ResourceGroupSettingModal();
const ResourceEventModal = await thisBot.ResourceEventModal();
const Setting = await thisBot.Setting();
const ResourceHeaderModal = await thisBot.ResourceHeaderModal();
const CalendarTitle = await thisBot.CalendarTitle();
const EventView = await thisBot.EventView();
const Menu = await thisBot.Menu();
const { useDayGridResponsiveLayout, useTodayButtonResponsiveLabel } =
  await thisBot.customHooks();
const { Playlistplaying } = Playlist;
const EditEvent = await thisBot.EditEvent();
const ResourceTitle = await thisBot.ResourceTitle();
const GoToCalendar = await thisBot.GoToClanedar();
const showEventPopup = await thisBot.showEventPopup();
const buildEventTooltipContent = await thisBot.buildEventTooltipContent();
const handleDatesSet = await thisBot.handleDateSet();
const handleDateClick = await thisBot.handleDateClick();
const handleEventContent = await thisBot.handleEventContent();
const handleResourceHeader = await thisBot.handleResourceHeader();
const CustomRepeatModal = await thisBot.RepeatModal();
const { onToolbarDateClick, onToolbarDateClick1 } =
  await thisBot.onToolbarClick1();
const addReadingPlans = await thisBot.addReadingPlans();
const handleResourceLabel = await thisBot.handleResourceLabel();
const {
  getDayDifference,
  stripTime,
  getMaxColumnsFromContainer,
  formatWeekdayDay,
  openSelf,
  parseDashedDateToValidDate,
  dayNameToNumber,
  updateCalendarHeader,
  isSameDate,
  dateOnly,
  getDayHeaderFormat,
  loadEventsFromLocalStorage,
} = await thisBot.calendarFunctions();

import { useCalendar } from "ext_calendar.calendar.CalendarContext";
const types = ["events", "reading", "content", "projects", "sources"];
if (!globalThis.C_E) globalThis.C_E = [];
const App = () => {
  const { t } = useSideBarContext();
  //states
  const [readings, setReadings] = useState([]);
  const [readingsList, setReadingsList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [playListMode, setPlaylistMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState();
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [visibleCount, setVisibleCount] = useState(3);
  const [calendarView, setCalendarView] = useState("dayGridMonth");
  const [openSetting, setOpenSetting] = useState(false);
  const [openMap, setOpenMap] = useState(true);
  const [openCalendar, setOpenCalendar] = useState(true);
  const [eventInView, setEventInView] = useState([]);
  const [eventViewSelected, setEventViewSelected] = useState(true);
  const [mapViewSelected, setMapViewSelected] = useState(false);
  const [playlistsToAdd, setPlaylistsToAdd] = useState([]);
  const [hasTitle, setHasTitle] = useState(true);
  const [repeat, setRepeat] = useState("No Repeat");
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedOption, setSelectedOption] = useState("No Repeat");

  const [allEvents, setAllEvents] = useState(() => {
    try {
      const saved = localStorage.getItem("allEvents");
      if (!saved) return [];

      const parsed = JSON.parse(saved);

      const unique = parsed.filter(
        (event, index, self) =>
          index === self.findIndex((e) => e.id === event.id)
      );

      // (Optional) Clean up localStorage to remove duplicates permanently
      localStorage.setItem("allEvents", JSON.stringify(unique));

      return unique;
    } catch (error) {
      console.error("Error parsing saved events:", error);
      return [];
    }
  });
  const [selectedTypes, setSelectedTypes] = useState(["events", "reading"]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentResourceId, setCurrentResourceId] = useState("");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupMenu, setGroupMenu] = useState({
    groupValue: null,
    position: null,
  });
  const [currentGroupValue, setCurrentGroupValue] = useState("");
  const [scheduleTitle, setScheduleTitle] = useState("Schedule");
  const [resourceDate, setResourceDate] = useState();
  const [resourceTime, setResorceTime] = useState();
  const [resourceETime, setResourceETime] = useState();
  const [modalPosition, setModalPosition] = useState();
  const [isSchedule, setIsSchedule] = useState(false);
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [showSchedules, setShowSchedules] = useState(true);
  const [showHolidays, setShowHolidays] = useState(false);
  const [resourcesByDate, setResourcesByDate] = useState({});
  const [resourceGroupName, setResourceGroupName] = useState("");
  const [isResourceGroupHiding, setIsResourceGroupHiding] = useState(false);
  const [resourceStartDate, setResourceStartDate] = useState();
  const [hiddenGroups, setHiddenGroups] = useState({});
  const [allGroups, setAllGroups] = useState([]);
  const [customDays, setCustomDays] = useState([]);
  const popoverOpenRef = useRef(false);
  //refs
  const customRepeatRef = useRef(null);
  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);
  const calendarApi = useRef(null);
  const activeToolbarHandlerRef = useRef(null);
  const resourcesRef = useRef(resourcesByDate);
  const resourceIdRef = useRef(currentResourceId);
  const resourceGroupNameRef = useRef(null);
  const experienceConRef = useRef(null);
  const customDaysRef = useRef([]);
  const selectedDaysRef = useRef([]);

  useEffect(() => {
    selectedDaysRef.current = selectedDays;
  }, [selectedDays]);

  useTodayButtonResponsiveLabel(experienceConRef);
  useEffect(() => {
    // Load from localStorage only once
    const savedEvents = localStorage.getItem("allEvents");
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents);
        setAllEvents(parsed);
      } catch (error) {
        console.error("Error loading events:", error);
      }
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("allEvents", JSON.stringify(allEvents));
    } catch (error) {
      console.error("Error saving events:", error);
    }
  }, [allEvents]);

  useEffect(() => {
    const allEventsStore = allEvents;
    if (showSchedules !== true) {
      const addEventsWithoutResource = allEventsStore.filter(
        (prev) => prev.extendedProps.isResource !== true
      );
      calendarApi?.current?.removeAllEvents();
      calendarApi?.current?.addEventSource(addEventsWithoutResource);
    } else {
      setAllEvents(allEventsStore);
      calendarApi?.current?.removeAllEvents();
      calendarApi?.current?.addEventSource(allEventsStore);
    }
  }, [showSchedules]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const popover = document.querySelector(".fc-popover");
      if (!popover && popoverOpenRef.current) {
        popoverOpenRef.current = false;
        calendarRef.current?.getApi().rerenderEvents();
      }
    });

    observer.observe(calendarRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (calendarApi.current !== null) {
      if (calendarApi.current.view.type === "resourceTimeline") {
        setIsSchedule(true);
      } else {
        setIsSchedule(false);
      }
    }
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      const popover = document.querySelector(".fc-popover");
      if (!popover) return;
      if (!popover.contains(e.target)) {
        popoverOpenRef.current = false;
        calendarRef.current?.getApi().rerenderEvents();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  //useeffects
  useEffect(() => {
    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });

    const loadTippy = async () => {
      // Only load if not already present
      if (!window.tippy) {
        try {
          await loadScript("https://unpkg.com/@popperjs/core@2");
          await loadScript(
            "https://unpkg.com/tippy.js@6/dist/tippy-bundle.umd.min.js"
          );
        } catch (err) {
          console.error("Failed to load Tippy or Popper:", err);
          return;
        }
      }
      const styleId = "tippy-stylesheet";
      if (!document.getElementById(styleId)) {
        const link = document.createElement("link");
        link.id = styleId;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/tippy.js@6/dist/tippy.css";
        document.head.appendChild(link);
      }

      setTimeout(() => {
        if (window.tippy) {
          window.tippy("[data-tippy-content]");
        }
      });
    };

    loadTippy();
  }, []);

  useEffect(() => {
    setReadings([...globalThis.C_E]);
  }, []);

  useEffect(() => {
    globalThis["defaultplaylists"];

    globalThis["readings"] = readings;
    return () => {
      globalThis["AddReadingPlans"] = null;
      globalThis["readings"] = null;
    };
  }, []);

  useEffect(() => {
    applyFilterByReinit();
  }, [selectedTypes]);

  useEffect(() => {
    resourcesRef.current = resourcesByDate;
  }, [resourcesByDate]);
  useEffect(() => {
    resourceIdRef.current = currentResourceId;
  }, [currentResourceId]);

  useEffect(() => {
    if (calendarApi.current !== null) {
      if (calendarApi.current.view.type === "resourceTimeline") {
        setIsSchedule(true);
      } else {
        setIsSchedule(false);
      }
    }
  }, [calendarView]);

  useEffect(() => {
    resourceGroupNameRef.current = resourceGroupName;
  }, [resourceGroupName]);

  const toolbarClickHandler = (e) => {
    if (calendarApi?.current.view.type.includes("resourceTimeline")) {
      onToolbarDateClick(e, calendarApi);
    } else {
      onToolbarDateClick1(e, calendarApi);
    }
  };

  const handleToggleSetting = () => setOpenSetting((prev) => !prev);
  const handleSelectionClicking = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };
  const getButtonStyle = (type) => ({
    backgroundColor: selectedTypes.includes(type) ? "#D36433" : "#F2F2F2",
    color: selectedTypes.includes(type) ? "white" : "black",
  });

  const onEventsClick = () => {
    setEventViewSelected((prev) => !prev);
  };
  const onMapCick = () => {
    setMapViewSelected((prev) => !prev);
    setOpenMap(true);
  };
  const handleDelete = (id) => {
    setReadings((prev) => prev.filter((item) => item.id !== id));
    setEventInView((prev) => prev.filter((ev) => ev.id !== id));
    const evt = calendarApi.current.getEventById(id);
    setAllEvents((prev) => prev.filter((ev) => ev.id !== id));
    if (evt) evt.remove();
  };
  const handleEditing = (id, isResource) => {
    const evt = calendarApi.current.getEventById(id);
    setEditingEvent(evt);
    setEditEventOpen(true);
  };

  const handleAddReadingPlans = (selected) => {
    addReadingPlans({
      selected,
      readings,
      setReadingsList,
      setEventInView,
      setAllEvents,
      setSelectedTypes,
      setReadings,
      parseDashedDateToValidDate,
    });
  };
  function onRangeChange(viewStart, viewEnd) {
    if (calendarApi.current !== null) {
      const allEvents = calendarApi.current.getEvents();

      const visibleEvents = allEvents.filter((event) => {
        const evStart = event.start;
        const evEnd = event.end || evStart;
        return evEnd > viewStart && evStart < viewEnd;
      });
      return visibleEvents;
    }
  }
  const visibleEvents = eventInView
    .filter(
      (ev) =>
        selectedTypes.includes(ev.extendedProps.type) &&
        ev.extendedProps.isResource !== true
    )
    .slice(0, visibleCount);
  const applyFilterByReinit = () => {
    if (!calendarApi.current) return;

    const filteredEvents = allEvents.filter((ev) =>
      selectedTypes.includes(ev.extendedProps.type)
    );

    calendarApi.current.removeAllEvents();
    calendarApi.current.addEventSource(filteredEvents);
  };

  useEffect(() => {
    const link = document.createElement("link");
    const container = document.querySelector(".experience-container");
    link.href =
      "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    if (calendarRef.current) {
      const calendarEle = document.getElementById("calendar");
      calendarApi.current = new FullCalendar.Calendar(calendarRef.current, {
        schedulerLicenseKey: "CC-Attribution-NonCommercial-NoDerivatives",
        headerToolbar: {
          left: "today,prev,next,title",
          center: "",
          right: "",
        },

        buttonText: {
          today: " ",
        },
        customButtons: {
          viewDropdown: {
            click: () => {},
          },
          customToday: {
            text: calendarEle.offsetWidth > 500 ? "Today" : "T",
            click: () => {
              calendarApi.current.today();
            },
          },
        },
        dayMaxEvents: 3,
        dayHeaderFormat: getDayHeaderFormat(
          calendarEle.offsetWidth,
          "dayGridMonth"
        ),

        views: {
          multiMonthYear: {
            type: "multiMonth",
            duration: { months: 12 },
            labelFormat: { year: "numeric" },
            multiMonthMaxColumns: getMaxColumnsFromContainer(),
            multiMonthMinWidth: 120,
            dayHeaderFormat: { weekday: "narrow" },
            eventDisplay: "none",
          },

          customResourceRange: {
            type: "resourceTimeline",
            duration: { days: 7 }, // default to 7 days
            buttonText: "Custom Range",
          },
        },

        slotMinTime: "00:00:00",
        slotMaxTime: "24:00:00",
        slotDuration: "00:30:00",
        scrollTime: "09:00:00",
        initialView: "dayGridMonth",
        moreLinkClick: (arg) => {
          popoverOpenRef.current = true;
          return "popover";
        },
        resourceAreaHeaderContent: handleResourceHeader({ setIsModalOpen }),
        resourceGroupLabelContent: function (arg) {
          return handleResourceLabel({
            arg,
            setResourceStartDate,
            setResourceGroupName,
            setGroupMenu,
          });
        },
        resourceGroupField: isResourceGroupHiding ? undefined : "group",

        allDaySlot: true,
        allDayText: "All day",
        expandRows: true,
        contentHeight: "450px",
        eventChange: function (info) {
          const updated = info.event;

          setAllEvents((prev) =>
            prev.map((ev) =>
              ev.id === updated.id
                ? {
                    ...ev,
                    start: updated.start?.toISOString(),
                    end: updated.end?.toISOString() || null,
                    allDay: updated.allDay,
                    extendedProps: {
                      ...ev.extendedProps,
                      ...updated.extendedProps,
                    },
                  }
                : ev
            )
          );
        },

        eventContent: (arg) =>
          handleEventContent({
            arg,
            experienceConRef,
            popoverOpenRef,
            dateOnly,
          }),
        eventClassNames: function (arg) {
          const width = experienceConRef.current?.offsetWidth || 0;
          const start = new Date(arg.event.start);
          const end = new Date(arg.event.end || arg.event.start);
          const startDate = dateOnly(start);
          const endDate = dateOnly(end);

          const isMultiDay = startDate !== endDate;

          if (width <= 500 && !isMultiDay && !popoverOpenRef.current) {
            return ["dot-view"];
          } else {
            return ["full-view"];
          }
        },

        editable: true,
        droppable: true,
        resourceAreaWidth: "180px",

        displayEventTime: false,
        eventDisplay: "block", // No time text

        dateClick: (info) =>
          handleDateClick({
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
            calendarRef,
          }),

        datesSet: (info) =>
          handleDatesSet({
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
            setCustomDays,
          }),

        eventDidMount: (info) => {
          if (!window.tippy) return;

          tippy(info.el, {
            trigger: "click",

            interactive: true,
            appendTo: () => document.body,
            placement: "auto",
            arrow: false,
            theme: "transparent",
            maxWidth: "none",
            offset: [0, 8],
            zIndex: 9999,
            allowHTML: true,
            content: "Loading...",

            onShow(tip) {
              const freshEvent = calendarApi.current?.getEventById(
                info.event.id
              );

              if (!freshEvent) return;

              const freshContent = buildEventTooltipContent({
                event: freshEvent,
                calendarApi,
                handleDelete,
                handleEditing,
                openSelf,
                Playlistplaying,
                isSameDate,
              });

              tip.setContent(freshContent);
            },
          });
        },
      });

      calendarApi.current.render();
      const observer = new ResizeObserver(() => {
        if (!calendarApi.current) return;
      });

      observer.observe(container);

      const resizeObserver = new ResizeObserver(() => {
        updateCalendarHeader(calendarApi.current);
      });
      resizeObserver.observe(calendarEle);
    }
  }, []);
  useEffect(() => {
    if (!calendarApi.current) return;
    calendarApi.current.removeAllEvents();
    calendarApi.current.addEventSource(allEvents);
  }, []);
  const viewType = calendarApi.current?.view?.type;
  let height;
  let marginTop;

  if (viewType === "multiMonthYear") {
    height = "450px";
    marginTop = "86px";
  } else if (viewType === "resourceTimeline") {
    height = "454px";
    marginTop = "71px";
  } else {
    height = "427px";
    marginTop = "108px";
  }

  useDayGridResponsiveLayout(experienceConRef, calendarApi);
  return (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/ical.js/1.4.0/ical.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@fullcalendar/icalendar@6.1.17/index.global.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.18/index.global.min.js"></script>
      <script src="fullcalendar-scheduler/dist/index.global.js"></script>

      <style>{tags["calendar.css"]}</style>
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />

      <div class="experience-container" ref={experienceConRef}>
        {calendarView !== "multiMonthYear" ? (
          <div
            style={{
              position: "absolute",
              top: hasTitle ? "147px" : "125px",
              left: "0",
              right: "0",
              height: "1px",
              borderRadius: "2px",

              backgroundColor: "#ddd",
            }}
          ></div>
        ) : (
          <div></div>
        )}
        <div
          style={{
            position: "absolute",
            display: "inline-block",
            right: "10px",
            top: "10px",
            cursor: "pointer",
          }}
          ref={dropdownRef}
          onClick={handleToggleSetting}
        >
          <div
            style={{
              padding: "4px 6px",
              border: "1px solid #d3d3d3",
              borderRadius: "5px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ transform: "translateY(2px)" }}
            >
              <path
                d="M8.06706 13.0501L11.7072 10.9484C12.0958 10.7241 12.2897 10.6119 12.431 10.4549C12.5561 10.3161 12.6506 10.1525 12.7083 9.9748C12.7734 9.77443 12.7734 9.55051 12.7734 9.10391V4.89447C12.7734 4.44787 12.7734 4.22397 12.7083 4.0236C12.6506 3.8459 12.5561 3.6822 12.431 3.54335C12.2903 3.38709 12.0969 3.27538 11.7116 3.05297L8.06641 0.948407C7.67782 0.724055 7.48391 0.612106 7.27734 0.568199C7.09458 0.52935 6.90562 0.52935 6.72285 0.568199C6.51629 0.612106 6.32173 0.724054 5.93314 0.948407L2.29229 3.05045C1.90415 3.27454 1.71023 3.3865 1.56901 3.54335C1.44398 3.6822 1.34956 3.8459 1.29182 4.0236C1.22656 4.22445 1.22656 4.44892 1.22656 4.89763V9.10093C1.22656 9.54964 1.22656 9.77396 1.29182 9.9748C1.34956 10.1525 1.44398 10.3161 1.56901 10.4549C1.71032 10.6119 1.90438 10.7241 2.29297 10.9484L5.93314 13.0501C6.32172 13.2744 6.51629 13.3864 6.72285 13.4303C6.90562 13.4692 7.09458 13.4692 7.27734 13.4303C7.48391 13.3864 7.67847 13.2744 8.06706 13.0501Z"
                stroke="black"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M5 6.99919C5 8.10376 5.89543 8.99919 7 8.99919C8.10457 8.99919 9 8.10376 9 6.99919C9 5.89462 8.10457 4.99919 7 4.99919C5.89543 4.99919 5 5.89462 5 6.99919Z"
                stroke="black"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          {openSetting && (
            <Setting
              setOpenSetting={setOpenSetting}
              dropdownRef={dropdownRef}
              setOpenCalendar={setOpenCalendar}
              setOpenMap={setOpenMap}
              setMapViewSelected={setMapViewSelected}
              setHasTitle={setHasTitle}
              hasTitle={hasTitle}
              calendarApi={calendarApi}
              setShowSchedules={setShowSchedules}
              showSchedules={showSchedules}
              showHolidays={showHolidays}
              setShowHolidays={setShowHolidays}
            />
          )}
        </div>
        {hasTitle && (
          <CalendarTitle
            setScheduleTitle={setScheduleTitle}
            isSchedule={isSchedule}
            scheduleTitle={scheduleTitle}
          />
        )}

        {isSchedule && (
          <GoToCalendar
            calendarApi={calendarApi}
            setCalendarView={setCalendarView}
          />
        )}

        <div
          style={{
            display: openCalendar ? "block" : "none",
            marginTop: hasTitle ? "" : "40px",
          }}
        >
          {calendarApi.current && (
            <div
              style={{
                height,
                width: "1px",
                zIndex: "999",
                backgroundColor: "#ddd",
                position: "absolute",
                marginTop,
              }}
            />
          )}

          <div class="calendar-wrapper">
            {
              <div
                id="calendar"
                ref={calendarRef}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  margin: "20px auto",
                  borderTop: "none",
                }}
              ></div>
            }
          </div>

          {isSchedule && (
            <ResourceTitle scheduleDescription={scheduleDescription} />
          )}
          {isModalOpen && (
            <ResourceHeaderModal
              setIsResourceGroupHiding={setIsResourceGroupHiding}
              calendarApi={calendarApi}
              isModalOpen={isModalOpen}
              resourcesRef={resourcesRef}
              setIsModalOpen={setIsModalOpen}
              resourcesByDate={resourcesByDate}
              setResourcesByDate={setResourcesByDate}
              allGroups={allGroups}
              setAllGroups={setAllGroups}
            />
          )}
          <GroupSettingsModal
            open={groupModalOpen}
            groupValue={currentGroupValue}
            groupRooms={
              calendarApi.current
                ?.getResources()
                .filter((r) => r.extendedProps.group === currentGroupValue) ||
              []
            }
            onRemoveRoom={(roomId) => {
              const calendar = calendarApi.current;
              if (!calendar) return;
              const resource = calendar.getResourceById(roomId);
              if (resource) {
                resource.remove();
              }
              setResourcesByDate((prev) => {
                const updated = {};
                Object.keys(prev).forEach((dateKey) => {
                  updated[dateKey] = prev[dateKey].filter(
                    (resource) => resource.id !== roomId
                  );
                });
                return updated;
              });
            }}
            onClose={() => setGroupModalOpen(false)}
            onDeleteGroup={(groupToDelete) => {
              const calendar = calendarApi.current;
              if (!calendar) return;

              calendar.getResources().forEach((resource) => {
                if (resource.extendedProps.group === groupToDelete) {
                  resource.remove();
                }
              });
            }}
            onAddRoom={(newRoom) => {
              const calendar = calendarApi.current;
              if (!calendar) return;

              calendar.addResource({
                id: newRoom.id,
                title: newRoom.title,
                group: newRoom.group,
              });
              const resKey = new Date(resourceStartDate).toLocaleDateString(
                "en-CA"
              );
              setResourcesByDate((prev) => {
                return {
                  ...prev,
                  [resKey]: [...(prev[resKey] || []), newRoom],
                };
              });
            }}
            updateGroupName={(oldGroup, newGroup) => {
              const calendar = calendarApi.current;
              if (!calendar) return;

              // 1) Update in FullCalendar
              calendar.getResources().forEach((resource) => {
                if (resource.extendedProps.group === oldGroup) {
                  resource.setExtendedProp("group", newGroup);
                }
              });

              // 2) Update in resourcesByDate state
              setResourcesByDate((prev) => {
                const updated = {};

                Object.keys(prev).forEach((dateKey) => {
                  updated[dateKey] = prev[dateKey].map((resource) => {
                    if (resource.group === oldGroup) {
                      return { ...resource, group: newGroup };
                    }
                    return resource;
                  });
                });

                return updated;
              });
            }}
          />
          {isEventModalOpen && (
            <ResourceEventModal
              calendarApi={calendarApi}
              currentResourceId={currentResourceId}
              setCurrentResourceId={setCurrentResourceId}
              allEvents={allEvents}
              setAllEvents={setAllEvents}
              isEventModalOpen={isEventModalOpen}
              setIsEventModalOpen={setIsEventModalOpen}
              resourceDatee={resourceDate}
              resourceTime={resourceTime}
              resourceETime={resourceETime}
              modalPosition={modalPosition}
              showSchedules={showSchedules}
            />
          )}

          <div class="calendar-addups">
            <div className="calendar-addups-selection">
              {types.map((type) => (
                <button
                  key={type}
                  style={getButtonStyle(type)}
                  className={`calendar-addups-selection-button ${type.charAt(0)}-btn`}
                  onClick={() => handleSelectionClicking(type)}
                >
                  {t(type + "Tab")}
                </button>
              ))}
            </div>

            <div class="event-and-map">
              <span class="event-and-map_heading">
                {t("eventsFor")} {calendarTitle}
              </span>
              <div class="event-and-map_selector">
                <span
                  class="event-and-map_selector_item"
                  style={{
                    backgroundColor: eventViewSelected ? "#D364334D" : "",
                    fontWeight: eventViewSelected ? "700" : "400",
                  }}
                  onClick={() => onEventsClick()}
                >
                  {t("eventsTab")}
                </span>
                <span
                  class="event-and-map_selector_item"
                  style={{
                    backgroundColor: mapViewSelected ? "#D364334D" : "",
                    fontWeight: mapViewSelected ? "700" : "400",
                  }}
                  onClick={() => onMapCick()}
                >
                  {t("bibleMap")}
                </span>
              </div>
              {eventViewSelected && (
                <EventView
                  visibleEvents={visibleEvents}
                  calendarApi={calendarApi}
                  visibleCount={visibleCount}
                  setVisibleCount={setVisibleCount}
                  setEventInView={setEventInView}
                  eventInView={eventInView}
                />
              )}
            </div>
          </div>
        </div>
        {groupMenu.position && (
          <Menu
            calendarApi={calendarApi}
            currentResourceId={currentResourceId}
            resourcesByDate={resourcesByDate}
            setResourcesByDate={setResourcesByDate}
            isResourceGroupHiding={isResourceGroupHiding}
            setIsResourceGroupHiding={setIsResourceGroupHiding}
            position={groupMenu.position}
            groupMenu={groupMenu}
            setGroupMenu={setGroupMenu}
            hiddenGroups={hiddenGroups}
            setHiddenGroups={setHiddenGroups}
            calendarView={calendarView}
            groupValue={groupMenu.groupValue}
            onClose={() => setGroupMenu({ groupValue: null, position: null })}
            onDelete={(groupToDelete) => {
              const calendar = calendarApi.current;
              if (!calendar) return;
              setResourcesByDate((prev) => {
                const updated = {};

                Object.keys(prev).forEach((date) => {
                  updated[date] = prev[date].filter(
                    (resource) =>
                      resource.group !== resourceGroupNameRef.current
                  );
                });

                return updated;
              });

              function ymdLocal(dLike) {
                const d = dLike instanceof Date ? dLike : new Date(dLike);
                if (Number.isNaN(d.getTime())) return ""; // guard against bad input
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                return `${y}-${m}-${day}`;
              }

              const targetYmd =
                typeof resourceStartDate === "string"
                  ? resourceStartDate.length > 10
                    ? ymdLocal(resourceStartDate)
                    : resourceStartDate // already YYYY-MM-DD
                  : ymdLocal(resourceStartDate);

              calendarApi.current.getEvents().forEach((ev) => {
                if (!ev.start) return;
                const evYmd = ymdLocal(ev.start);
                if (evYmd === targetYmd) ev.remove();
              });

              setAllEvents((prev) =>
                prev.filter(
                  (e) => ymdLocal(e.start || e.startStr) !== targetYmd
                )
              );
              calendar.getResources().forEach((resource) => {
                if (resource.extendedProps.group === groupToDelete) {
                  resource.remove();
                }
              });
            }}
            setOpenEditModal={(value) => {
              if (value) setCurrentGroupValue(groupMenu.groupValue);
              setGroupModalOpen(value);
              setGroupMenu({ groupValue: null, position: null });
            }}
          />
        )}

        {modalOpen ? (
          <CustomModal
            setSelectedDays={setSelectedDays}
            selectedDays={selectedDays}
            customRepeatRef={customRepeatRef}
            setModalOpen={setModalOpen}
            handleAddReadingPlans={handleAddReadingPlans}
            calendarApi={calendarApi}
            setRepeat={setRepeat}
            showCustomRepeat={showCustomRepeat}
            setShowCustomRepeat={setShowCustomRepeat}
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
          />
        ) : (
          ""
        )}
        {showCustomRepeat && (
          <div ref={customRepeatRef}>
            <CustomRepeatModal
              selectedDays={selectedDays}
              setSelectedDays={setSelectedDays}
              initialDate={new Date().toISOString().split("T")[0]}
              onClose={() => setShowCustomRepeat(false)}
              onSave={(days) => {
                setRepeat(`Custom (${days.join(", ")})`);
              }}
            />
          </div>
        )}
        {editEventOpen && (
          <EditEvent
            editingEvent={editingEvent}
            editEventOpen={editEventOpen}
            setEditEventOpen={setEditEventOpen}
            calendarApi={calendarApi}
            setEventInView={setEventInView}
          />
        )}
      </div>
    </>
  );
};
return App;
