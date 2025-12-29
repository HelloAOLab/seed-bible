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
} = await thisBot.calendarFunctions();
import { useCalendar } from "ext_calendar.calendar.CalendarContext";

//const MapPanel = await MapsManager?.GetMapPanel?.();
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
  const [allEvents, setAllEvents] = useState([]);
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
  const popoverOpenRef = useRef(false);
  //refs

  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);
  const calendarApi = useRef(null);
  let activeToolbarHandler = null;
  const resourcesRef = useRef(resourcesByDate);
  const resourceIdRef = useRef(currentResourceId);
  const resourceGroupNameRef = useRef(null);
  const experienceConRef = useRef(null);

  useTodayButtonResponsiveLabel(experienceConRef);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const popover = document.querySelector(".fc-popover");
      if (!popover && popoverOpenRef.current) {
        popoverOpenRef.current = false;
        calendarRef.current?.getApi().rerenderEvents();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

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

  /*useEffect(() => {
    readings.forEach((evt) => {
      const existing = calendarApi.current.getEventById(evt.id);
      if (!existing) {
        calendarApi.current.addEvent(evt);
      }
    });
    return () => {
      // Optional cleanup if readings change or component unmounts
      readings.forEach((evt) => {
        const existing = calendarApi.current.getEventById(evt.id);
        if (existing) {
          existing.remove();
        }
      });
    };
  }, [readings]);*/
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
  }, []);

  useEffect(() => {
    resourceGroupNameRef.current = resourceGroupName;
  }, [resourceGroupName]);

  //handles
  function onToolbarDateClick1(e) {
    const titleEl = e.target.closest(".fc-toolbar-title");
    if (!titleEl) return;

    const calendar = calendarApi.current;
    if (!calendar) return;

    Object.assign(titleEl.style, {
      color: "#303133",
      fontSize: "medium",
      fontWeight: "400",
      transform: "translateY(3px)",
      display: "inline-block",
    });

    const text = titleEl.textContent.trim();
    let parsed;

    try {
      parsed = new Date(`${text} 15, 12:00:00`);
    } catch {
      parsed = new Date();
    }

    const iso = isNaN(parsed)
      ? new Date().toISOString().slice(0, 10)
      : parsed.toISOString().slice(0, 10);

    const input = document.createElement("input");
    input.type = "date";
    input.value = iso;
    input.style.minWidth = `${titleEl.offsetWidth}px`;
    input.style.fontSize = window.getComputedStyle(titleEl).fontSize;
    input.style.padding = "2px";

    const currentDate = calendar.getDate();
    titleEl.replaceWith(input);
    input.focus();

    const finish = () => {
      if (input.value) {
        calendar.gotoDate(input.value);
      } else {
        calendar.gotoDate(currentDate);
      }
      input.replaceWith(titleEl);
    };

    input.addEventListener("blur", finish, { once: true });
    input.addEventListener(
      "keydown",
      (ke) => ke.key === "Enter" && input.blur(),
      { once: true }
    );
  }
  function onToolbarDateClick(e) {
    const titleEl = e.target.closest(".fc-toolbar-title");
    if (!titleEl) return;

    const calendar = calendarApi.current;

    const existing = document.querySelector(".custom-range-container");
    if (existing) {
      existing.replaceWith(titleEl); // restore title if still mounted
      return; // stop creating multiple
    }

    const originalTitle = titleEl.textContent;

    // create container
    const container = document.createElement("div");
    container.className = "custom-range-container";
    container.style.display = "flex";
    container.style.gap = "6px";
    container.style.alignItems = "center";

    // start input
    const startInput = document.createElement("input");
    startInput.type = "date";
    startInput.value = calendar.view.currentStart.toLocaleDateString("en-CA");

    // end input
    const endInput = document.createElement("input");
    endInput.type = "date";
    endInput.value = calendar.view.currentEnd.toLocaleDateString("en-CA");

    // ok button
    const okBtn = document.createElement("button");
    okBtn.textContent = "OK";
    okBtn.style.padding = "2px 6px";
    okBtn.style.cursor = "pointer";

    // replace title with container
    titleEl.replaceWith(container);
    container.appendChild(startInput);
    container.appendChild(endInput);
    container.appendChild(okBtn);

    const finish = () => {
      if (startInput.value && endInput.value) {
        calendar.gotoDate(startInput.value);
        calendar.setOption("visibleRange", {
          start: startInput.value,
          end: endInput.value,
        });
      } else {
        titleEl.textContent = originalTitle;
      }
      container.replaceWith(titleEl);
    };

    okBtn.addEventListener("click", finish);

    // escape key cancels
    const handleKey = (ke) => {
      if (ke.key === "Escape") {
        container.replaceWith(titleEl);
        titleEl.textContent = originalTitle;
      }
    };

    startInput.addEventListener("keydown", handleKey);
    endInput.addEventListener("keydown", handleKey);

    startInput.focus();
  }

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

  const addReadingPlans = (selected) => {
    const playLists = selected.reduce(
      (acc, item) => acc.concat({ list: item.list, playList: item.name }),
      []
    );
    setReadingsList((prev) => [...prev, ...playLists]);

    let start;
    if (playLists[0]?.list[0]?.type !== "date") {
      start = new Date();
    }
    const newEvents = [];

    playLists.forEach((item) => {
      const playList = item.playList;
      let list = [];

      item.list.forEach((itm) => {
        if (itm.type === "date") {
          list = [];
          start = parseDashedDateToValidDate(itm.content);
        } else {
          const value = itm.content.replace(/Genesis/g, "GEN");

          list.push(value);
          const eventDate = start;

          const eventTitle = playList;

          const isDuplicate = newEvents.some(
            (e) =>
              e.title === eventTitle &&
              new Date(e.start).toDateString() === eventDate.toDateString()
          );

          if (!isDuplicate) {
            newEvents.push({
              title: eventTitle,

              start: eventDate,

              id: uuid(),
              isReadingPlan: true,
              classNames: ["readingPlan"],
              color: "white",
              extendedProps: {
                startTime: "",
                endTime: "",
                isReapeating: false,
                type: "reading",
              },

              allDay: true,
              source: "reading",

              description: `Reading from playlist: ${playList}`,
            });
          }
        }
      });
    });

    if (newEvents.length > 0) {
      globalThis.C_E.push(...newEvents);
      const list = [];

      newEvents.forEach((item) => {
        const isDuplicate = readings.some(
          (e) =>
            e.title === item.title &&
            new Date(e.start).toDateString() ===
              new Date(item.start).toDateString()
        );

        if (!isDuplicate) {
          list.push(item);
        }
      });
      setEventInView((prev) => {
        const combined = [...prev, ...list];

        combined.sort((a, b) => new Date(a.start) - new Date(b.start));
        return combined;
      });
      setAllEvents((prev) => [...prev, ...list]);
      setSelectedTypes((prev) => ["reading", ...prev]);

      setReadings((prev) => [...list, ...prev]);
    } else {
      return;
    }
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
        resourceAreaHeaderContent: function () {
          const wrapper = document.createElement("div");
          wrapper.style.display = "flex";
          wrapper.style.justifyContent = "space-between";
          wrapper.style.alignItems = "center";

          const label = document.createElement("span");
          label.textContent = "Schedule";

          const addButton = document.createElement("button");
          addButton.textContent = "+";
          addButton.style.marginLeft = "8px";
          addButton.style.fontSize = "8px";
          addButton.style.paddin = "0 0";

          addButton.title = "Add New Group";
          addButton.style.cursor = "pointer";

          addButton.onclick = () => {
            setIsModalOpen(true);
          };

          wrapper.appendChild(label);
          wrapper.appendChild(addButton);
          return { domNodes: [wrapper] };
        },
        resourceGroupLabelContent: function (arg) {
          setResourceStartDate(arg.view.currentStart);
          setResourceGroupName(arg.groupValue);
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{arg.groupValue}</span>
              <button
                ref={(el) => {
                  if (el) el.dataset.groupValue = arg.groupValue;
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setGroupMenu({
                    groupValue: arg.groupValue,
                    position: {
                      top: rect.top + window.scrollY + 20,
                      left: rect.left + window.scrollX,
                    },
                  });
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="gray">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </div>
          );
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

        eventContent: function (arg) {
          const isSchedule = arg.event.extendedProps.isResource === true;

          const eventType = arg.event.extendedProps.type;

          const isNarrow =
            experienceConRef.current &&
            experienceConRef.current?.offsetWidth < 500;

          const clockSvg = (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
        viewBox="0 0 24 24" fill="none" stroke="${color}"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="12" x2="12" y2="7"></line>
        <line x1="12" y1="12" x2="16" y2="14"></line>
      </svg>
    `;

          const makeDot = (color, withClock = false) => `
      <div style="display:flex;align-items:center;justify-content:center;gap:0.2em;width:100%;">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
        ${withClock ? clockSvg(color) : ""}
      </div>
    `;
          const start = new Date(arg.event.start);
          const end = new Date(arg.event.end || arg.event.start);

          const startDate = dateOnly(start);
          const endDate = dateOnly(end);

          const isMultiDay = startDate !== endDate;
          let title;
          if (arg.event.title.length > 6) {
            const titleEl = arg.event.title.includes(" ")
              ? arg.event.title.split(" ")[0]
              : arg.event.title.slice(0, 6);
            title = `${titleEl}...`;
          } else {
            title = arg.event.title;
          }

          // Compact mode (mobile, no popover)
          if (isNarrow && !popoverOpenRef.current && !isMultiDay) {
            if (isSchedule) return { html: "" };
            if (eventType === "reading") return { html: makeDot("#20c997") };
            return { html: makeDot("#339af0") };
          }

          // Popover open — show full event

          if (popoverOpenRef.current) {
            return {
              html: `
          <div style="
            display:flex;align-items:center;
            background:#e7f5ff;
            color:#1c3d5a;
            border:1px solid #74c0fc;
            border-radius:0.5em;
            padding:0.3em 0.5em;
            font-size:clamp(0.65rem, 0.8vw, 0.85rem);
            max-width:100%;
            overflow:hidden;
            text-overflow:ellipsis;">
            <span>${title}</span>
          </div>
        `,
            };
          }

          // Normal schedule
          if (isSchedule && !popoverOpenRef.current) {
            if (!isMultiDay) {
              return {
                html: `
          <div style="
            display:flex;align-items:center;
            background:#e6fcf5;
            color:#0b7285;
            border:1px solid #63e6be;
            border-radius:0.5em;
            padding:0.3em 0.5em;
            font-size:clamp(0.65rem, 0.8vw, 0.85rem);
            max-width:100%;
            overflow:hidden;text-overflow:ellipsis;">
            <span>${title}</span>
          </div>
        `,
              };
            } else {
              return {
                html: `
        <div style="
          display:flex;align-items:center;gap:0.4em;
          background:#fdfdea;
          color:#2d3436;
          border:1px solid #a5d8ff;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;
          text-overflow:ellipsis;">
          ${clockSvg("#f1c40f")}
          <span>${arg.event.title}</span>
        </div>
      `,
              };
            }
          }

          // Reading events
          if (eventType === "reading" && !popoverOpenRef.current) {
            if (!isMultiDay) {
              return {
                html: `
  <div style="
    display:flex;
    margin-left:6px;
    align-items:stretch;  /* important */
    background:#E1F3D8;
    color:#67C23A;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
   
    width:max-content;
    font-size:clamp(0.65rem, 0.8vw, 0.85rem);
  ">
    <div style="width:3px;background:#67C23A;border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;"></div>
    <span style="padding:2px 4px;padding:2px 3px; overflow-wrap: break-word;">${title}</span>
  </div>
`,
              };
            } else {
              return {
                html: `
        <div style="
          display:flex;align-items:center;
          background:#e6fcf5;
          color:#0b7285;
          border:1px solid #63e6be;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;
          text-overflow:ellipsis;">
          <span>${arg.event.title}</span>
        </div>
      `,
              };
            }
          }

          // Default event style
          if (!isMultiDay && !popoverOpenRef.current) {
            return {
              html: `
  <div style="
    display:flex;
    margin-left:6px;
    align-items:stretch;  /* important */
    background:#D9ECFF;
    color:#409EFF;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
   
    width:max-content;
    font-size:clamp(0.65rem, 0.8vw, 0.85rem);
  ">
    <div style="width:3px;background:#409EFF;border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;"></div>
    <span style="padding:2px 4px;padding:2px 3px; overflow-wrap: break-word;">${title}</span>
  </div>
`,
            };
          } else {
            return {
              html: `
        <div style="
          display:flex;align-items:center;
          background:#e6fcf5;
          color:#0b7285;
          border:1px solid #63e6be;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;
          text-overflow:ellipsis;">
          <span>${arg.event.title}</span>
        </div>
      `,
            };
          }
        },
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

        dateClick: async function (info) {
          if (info.jsEvent?.target.closest(".tippy-box")) return;
          const date = info.date;
          if (!calendarApi) {
            return;
          }
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
            const rect = container.getBoundingClientRect();
            const clickX = info.jsEvent.clientX - rect.left;
            const clickY = info.jsEvent.clientY - rect.top;
            setIsEventModalOpen(true);
            setResourceDate(date.toISOString().split("T")[0]);
            setCurrentResourceId(info?.resource.id || null);
            setResorceTime(timeStr);
            setResourceETime(endStr);
            setModalPosition({ x: clickX, y: clickY });
          }
          if (
            info.view.type !== "multiMonthYear" &&
            info.view.type !== "resourceTimeline"
          ) {
            showEventPopup(
              info,
              setPlaylistMode,
              setScheduleTitle,
              setScheduleDescription,
              addReadingPlans,
              playlistsToAdd,
              setPlaylistsToAdd,
              calendarApi,
              setCalendarView,
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
                if (isPlansTabActive) return;
                let newEvent;

                const days = getDayDifference(start, end);
                if (recurVal.charAt(0) === "N") {
                  const isTimed = Boolean(startTime && endTime);

                  if (days === 0) {
                    newEvent = {
                      title: title ? title : "easter",
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

                    const now = stripTime(new Date());
                    const startDate = stripTime(new Date(newEvent.start));
                    setAllEvents((prev) => [...prev, newEvent]);

                    if (startDate >= now) {
                      setEventInView((prev) => {
                        const combined = [...prev, newEvent];
                        combined.sort(
                          (a, b) => new Date(a.start) - new Date(b.start)
                        );
                        return combined;
                      });
                    }
                    calendarApi.current.addEvent(newEvent);
                  } else {
                    newEvent = {
                      title: title ? title : "easter",
                      id: uuid(),
                      start: isTimed ? `${start}T${startTime}:00` : start,
                      end: isTimed ? `${end}T${endTime}:00` : end,
                      allDay: isTimed ? false : true,
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
                    const now = stripTime(new Date());
                    const startDate = stripTime(new Date(newEvent.start));
                    if (startDate >= now) {
                      setEventInView((prev) => {
                        const combined = [...prev, newEvent];
                        combined.sort(
                          (a, b) => new Date(a.start) - new Date(b.start)
                        );
                        return combined;
                      });
                    }
                    if (newEvent) {
                      setAllEvents((prev) => [...prev, newEvent]);
                    }
                    calendarApi.current.addEvent(newEvent);
                  }
                } else {
                  if (recurVal.charAt(0) === "R") {
                    const isTimed = startTime && endTime;
                    const words = recurVal.split(" ");
                    const thirdWord = words[2];
                    const day = dayNameToNumber(thirdWord);
                    newEvent = {
                      title: title ? title : "easter",
                      id: uuid(),
                      start: isTimed ? `${start}T${startTime}:00` : start,
                      end: isTimed ? `${end}T${endTime}:00` : end,
                      daysOfWeek: [day],
                      allDay: isTimed ? false : true,
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
                    const now = stripTime(new Date());
                    const startDate = stripTime(new Date(newEvent.start));
                    setAllEvents((prev) => [...prev, newEvent]);

                    if (startDate >= now) {
                      setEventInView((prev) => {
                        const combined = [...prev, newEvent];
                        combined.sort(
                          (a, b) => new Date(a.start) - new Date(b.start)
                        );
                        return combined;
                      });
                    }

                    calendarApi.current.addEvent(newEvent);
                  } else {
                    if (recurVal.charAt(0) === "c") {
                      newEvent = {
                        title: title ? title : "easter",
                        id: uuid(),
                        daysOfWeek: customDaysRef.current, // Monday and Wednesday
                        start: start,

                        end: end,
                        color: "white",
                        allDay: true,
                        theme: "simple-borderless",
                        classNames: ["user-event"],
                        extendedProps: {
                          description,
                          link,
                          isReapeating: true,
                          type: "events",
                        },
                      };
                      const now = stripTime(new Date());
                      const startDate = stripTime(new Date(newEvent.start));
                      setAllEvents((prev) => [...prev, newEvent]);

                      if (startDate >= now) {
                        setEventInView((prev) => {
                          const combined = [...prev, newEvent];
                          combined.sort(
                            (a, b) => new Date(a.start) - new Date(b.start)
                          );
                          return combined;
                        });
                      }

                      calendarApi.current.addEvent(newEvent);
                    }
                  }
                }
              }
            );
          }
          /* else {
            if (info.view.type !== "resourceTimeline") {
              const clickedDate = info.date;
              // JS Date

              const isoStr = info.dateStr; // "YYYY-MM-DD"
              const weekdayDay = formatWeekdayDay(clickedDate);

              const events = calendarApi.current.getEvents();
              const matched = events.filter((ev) => {
                const clickedDateLocal = info.date.toLocaleDateString("en-CA");
                const eventDateLocal = ev.start.toLocaleDateString("en-CA");
                return clickedDateLocal === eventDateLocal;
              });
              console.log(matched, "kjkjkj");
              const eventTitle =
                matched.length > 0
                  ? matched.map((ev) => ev.title).join(", ")
                  : "No Event";

              const referenceEl = info.dayEl;
              const html = createMiniModalContent(weekdayDay, eventTitle);

              // 4️⃣ Initialize & show tippy
              const instance = tippy(referenceEl, {
                content: html,
                allowHTML: true,
                theme: "my-custom",
                arrow: true,
                interactive: true,
                placement: "auto",
                delay: [100, 0],
                duration: [300, 200],
                maxWidth: 300,
                hideOnClick: true,
                trigger: "manual",
                appendTo: () => document.body,
                zIndex: 9999,
              });
              instance.show();
            }
          }*/
        },

        datesSet: (info) => {
          const startDate = new Date(info.startStr).toLocaleDateString("en-CA");
          const newResources = resourcesRef.current[startDate] || [];
          calendarApi.current.setOption("resources", newResources);
          updateCalendarHeader(calendarApi.current);
          const { start, end } = info;
          setCalendarTitle(info.view.title);
          setCalendarView(calendarApi.current.view.type);
          const todayBtn =
            calendarRef.current.querySelector(".fc-today-button");
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
            calendarap.setOption("titleFormat", {
              year: "numeric",
              month: "long",
            });
          }
          if (info.view.type === "resourceTimelineDay") {
            if (todayBtn) todayBtn.style.display = "none";
            if (addButton) addButton.style.display = "none";
            if (select) select.style.display = "none";

            if (prevBtn) {
              prevBtn.onclick = (e) => e.preventDefault();
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
            (a, b) => new Date(a.start) - new Date(b.start)
          );
          setEventInView(sortedEvents);

          const styleButtons = () => {
            if (prevBtn) {
              Object.assign(prevBtn.style, {
                backgroundColor: "white",
                color: "black",
                fontSize: "10px",
                fontWeight: "700",
                padding: "0",
                border: "none",
                marginRight: "10px",

                alignSelf: "center",
                cursor:
                  info.view.type === "resourceTimelineDay"
                    ? "not-allowed"
                    : "pointer",
                opacity: info.view.type === "resourceTimelineDay" ? "0.5" : "1",
              });
              prevBtn.onfocus = prevBtn.onmousedown = () => {
                prevBtn.style.outline = "none";
                prevBtn.style.boxShadow = "none";
              };
            }

            if (nextBtn) {
              Object.assign(nextBtn.style, {
                backgroundColor: "white",
                color: "black",
                fontSize: "10px",
                padding: "0",
                border: "none",
                fontWeight: "900",

                marginRight: "10px",
                cursor:
                  info.view.type === "resourceTimelineDay"
                    ? "not-allowed"
                    : "pointer",
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
                  backgroundColor: "white",
                  textTransform: "capitalize",
                  color: "#606266",
                  fontWeight: "300",
                  fontSize: "15px",
                  marginRight: "10px",
                  border: "1px solid #d3d3d3",
                  padding: "4px 16px",
                  cursor: "pointer",
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
            if (activeToolbarHandler) {
              toolbar.removeEventListener("click", activeToolbarHandler);
            }

            if (info.view.type.includes("resourceTimeline")) {
              activeToolbarHandler = onToolbarDateClick;
            } else {
              activeToolbarHandler = onToolbarDateClick1;
            }

            toolbar.addEventListener("click", activeToolbarHandler);
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
                  fontSize: "14px",
                  transform: "translateX(10px)",
                  fontFamily: "Satoshi",
                  fontWeight: "400",
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
                  fontSize: "14px",
                  fontFamily: "Satoshi",

                  fontWeight: "400",
                  color: "#606266",
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
              const w = viewSelect.querySelector(
                'option[value="timeGridWeek"]'
              );
              const m = viewSelect.querySelector(
                'option[value="dayGridMonth"]'
              );
              const y = viewSelect.querySelector(
                'option[value="multiMonthYear"]'
              );
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
        },

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
              // 🔥 ALWAYS fetch latest event by ID
              const freshEvent = calendarApi.current?.getEventById(
                info.event.id
              );

              if (!freshEvent) return;

              const freshContent = buildEventTooltipContent({
                event: freshEvent, // ✅ always latest
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

  const resizeCalendar = () => {
    const calendarElement = calendarRef.current; // or your ref
    const width = calendarElement?.offsetWidth;

    const newHeight = width * 0.5; // example ratio
    calendarElement.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    resizeCalendar();
  }, []);
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

      <div
        class="experience-container"
        ref={experienceConRef}
        style={{
          backgroundColor: "white",
          padding: "12px",
          position: "relative",
          minHeight: "100%",
          height: "min-content",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: hasTitle ? "147px" : "125px", // place at very top of container
            left: "0",
            right: "0",
            height: "1px",
            borderRadius: "2px",

            backgroundColor: "#ddd",
          }}
        ></div>
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
                height:
                  calendarApi.current.view.type !== "multiMonthYear"
                    ? "427px"
                    : "449px",
                width: "1px",
                zIndex: "999",
                backgroundColor: "#ddd",
                position: "absolute",
                marginTop:
                  calendarApi.current.view.type !== "multiMonthYear"
                    ? "111px"
                    : "89px",
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
            setModalOpen={setModalOpen}
            addReadingPlans={addReadingPlans}
            calendarApi={calendarApi}
          />
        ) : (
          ""
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
