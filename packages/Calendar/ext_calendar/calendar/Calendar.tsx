//imports
const { createContext, useContext, useRef, useState, useEffect } = os.appHooks;
const CustomModal = await thisBot.CustomModal();
const GroupSettingsModal = await thisBot.ResourceGroupSettingModal();
const ResourceEventModal = await thisBot.ResourceEventModal();
const Setting = await thisBot.Setting();
const ResourceHeaderModal = await thisBot.ResourceHeaderModal();
const CalendarTitle = await thisBot.CalendarTitle();
const EventView = await thisBot.EventView();
const Menu = await thisBot.Menu();
const { Playlistplaying } = Playlist
const EditEvent = await thisBot.EditEvent();
const ResourceTitle = await thisBot.ResourceTitle();
const GoToCalendar = await thisBot.GoToClanedar();
const showEventPopup = await thisBot.showEventPopup();
const getHolidaysForRange = await thisBot.getHolidays();
import { useCalendar } from 'ext_calendar.calendar.CalendarContext';
const MapPanel = await MapsManager?.GetMapPanel?.();
function getDayDifference(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}


function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function updateTodayButtonLabel() {
  const container = document.querySelector('.experience-container');
  const todayBtn = document.querySelector('.fc-today-button');

  if (!container || !todayBtn) return;

  const width = container.offsetWidth;
  const label = width < 550 ? 'T' : 'Today';


  if (todayBtn.textContent !== label) {
    todayBtn.textContent = label;
  }
};


function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function getDayHeaderFormat(width, viewType) {

  if (viewType.startsWith('timeGridDay')) {
    return { weekday: 'long' };
  }
  if (viewType.startsWith('multiMonthYear')) {
    return { weekday: 'narrow' }
  }



  if (width < 400) {
    return { weekday: 'narrow' };     // S, M, T
  } else if (width < 700) {
    return { weekday: 'short' };      // Sun, Mon, Tue
  } else {
    return { weekday: 'long' };       // Sunday, Monday
  }
}
function isSameDate(date1, date2) {
  // Convert both inputs to Date objects safely
  const d1 = new Date(date1);

  // Handle cases like "Oct - 14 - 2025" or "14-10-25"
  let d2;
  if (typeof date2 === "string") {
    const clean = date2.replace(/\s+/g, '');
    // Try "Mon - DD - YYYY" (e.g., Oct-14-2025)
    if (/[a-zA-Z]{3}-\d{1,2}-\d{4}/.test(clean)) {
      const [monthStr, day, year] = clean.split('-');
      const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      d2 = new Date(year, monthMap[monthStr], parseInt(day));
    }
    // Try "DD-MM-YY" or "DD-MM-YYYY"
    else if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(clean)) {
      const [day, month, year] = clean.split('-').map(Number);
      d2 = new Date(year < 100 ? 2000 + year : year, month - 1, day);
    } else {
      // Fallback to Date parser
      d2 = new Date(date2);
    }
  } else {
    d2 = new Date(date2);
  }

  // Compare only date parts (ignore time)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}



function updateCalendarHeader(calendar) {
  const width = calendar.el.offsetWidth;
  const viewType = calendar.view.type;
  const format = getDayHeaderFormat(width, viewType);
  calendar.setOption('dayHeaderFormat', format);
}

const dayNameToNumber = (dayName) => {
  const days = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7
  };
  return days[dayName] || null;
};

function parseDashedDateToValidDate(dateStr) {
  const parts = dateStr.split('-').map(p => p.trim());
  if (parts.length !== 3) return null;

  const [month, day, year] = parts;
  const formatted = `${month} ${day}, ${year}`;

  const date = new Date(formatted);
  return isNaN(date.getTime()) ? null : date;
}

const types = ["events", "reading", "content", "projects", "sources"];

if (!globalThis.C_E) globalThis.C_E = [];

//caledar component
const App = () => {
  //states
  const [readings, setReadings] = useState([]);
  const [readingsList, setReadingsList] = useState([]);
  const [customDays, setCustomDays] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [playListMode, setPlaylistMode] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [editingEvent, setEditingEvent] = useState();
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [visibleCount, setVisibleCount] = useState(3);
  const [calendarView, setCalendarView] = useState('dayGridMonth');

  const [openSetting, setOpenSetting] = useState(false);
  const [openMap, setOpenMap] = useState(true);
  const [openCalendar, setOpenCalendar] = useState(true);
  const [eventInView, setEventInView] = useState([]);
  const [eventViewSelected, setEventViewSelected] = useState(true);
  const [mapViewSelected, setMapViewSelected] = useState(false);
  const [playlistsToAdd, setPlaylistsToAdd] = useState([]);


  const [hasTitle, setHasTitle] = useState(true);
  const [allEvents, setAllEvents] = useState(() => {
  try {
    const saved = localStorage.getItem("allEvents");
    if (!saved) return [];

    const parsed = JSON.parse(saved);

    // 🔥 Remove duplicates based on the "id" field
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
  const [selectedTypes, setSelectedTypes] = useState(['events','reading']);
  const [isModalOpen, setIsModalOpen] = useState(false);



  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentResourceId, setCurrentResourceId] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupMenu, setGroupMenu] = useState({ groupValue: null, position: null });
  const [currentGroupValue, setCurrentGroupValue] = useState('');
  const [scheduleTitle, setScheduleTitle] = useState('Schedule');
  const [resourceDate, setResourceDate] = useState();
  const [resourceTime, setResorceTime] = useState();
  const [resourceETime, setResourceETime] = useState();
  const [modalPosition, setModalPosition] = useState();
  const [isSchedule, setIsSchedule] = useState(false);
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [showSchedules, setShowSchedules] = useState(true);
  const [showHolidays, setShowHolidays] = useState(false);
  const [resourcesByDate, setResourcesByDate] = useState({});
  const [resourceGroupName, setResourceGroupName] = useState('');
  const [isResourceGroupHiding, setIsResourceGroupHiding] = useState(false);
  const [resourceStartDate, setResourceStartDate] = useState();
  const [hiddenGroups, setHiddenGroups] = useState({});
  const [allGroups, setAllGroups] = useState([]);
  let popoverOpen = false;

  // Detect popover open (when clicking "more")
  document.addEventListener("click", (e) => {
    const moreBtn = e.target.closest(".fc-daygrid-more-link");
    if (moreBtn) {
      // Wait a moment for popover to appear
      setTimeout(() => {
        const pop = document.querySelector(".fc-popover");
        popoverOpen = !!pop;
        console.log("Popover opened:", popoverOpen);
      }, 50);
    }
  });

  // Detect popover close (click outside)
  document.addEventListener("mousedown", (e) => {
    const pop = document.querySelector(".fc-popover");
    if (pop && !pop.contains(e.target)) {
      popoverOpen = false;
      console.log("Popover closed:", popoverOpen);
    }
  });





  //refs
  const readingsRef = useRef(null);
  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);
  const calendarApi = useRef(null);
  let activeToolbarHandler = null;
  const resourcesRef = useRef(resourcesByDate);
  const resourceIdRef = useRef(currentResourceId)
  const resourceGroupNameRef = useRef(null);


  let { name, apiCalendar, setApiCalendar } = useCalendar();

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
}, []); // empty deps → only runs once
  useEffect(() => {
    try {

      localStorage.setItem("allEvents", JSON.stringify(allEvents));
    } catch (error) {
      console.error("Error saving events:", error);
    }
  }, [allEvents]);
  useEffect(() => {
    setApiCalendar(calendarApi.current);
  });
  //useeffects

  useEffect(() => {
    // Load styles


    // Load scripts sequentially
    const scripts = [
      "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/resource-timegrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/icalendar@6.1.17/index.global.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/ical.js/1.4.0/ical.min.js",

    ];

    function loadScriptsSequentially(index = 0, callback) {
      if (index >= scripts.length) return callback();

      const script = document.createElement("script");
      script.src = scripts[index];
      script.onload = () => loadScriptsSequentially(index + 1, callback);
      script.onerror = () => console.error("Failed to load", scripts[index]);
      document.body.appendChild(script);
    }

    loadScriptsSequentially(0, () => {
      console.log("FullCalendar scripts loaded");
    });
  }, []);
  useEffect(() => {
    readingsRef.current = readingsList;
  }, [readingsList]);

  useEffect(() => {
    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
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
          await loadScript('https://unpkg.com/@popperjs/core@2');
          await loadScript('https://unpkg.com/tippy.js@6/dist/tippy-bundle.umd.min.js');
        } catch (err) {
          console.error('Failed to load Tippy or Popper:', err);
          return;
        }
      }
      const styleId = 'tippy-stylesheet';
      if (!document.getElementById(styleId)) {
        const link = document.createElement('link');
        link.id = styleId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/tippy.js@6/dist/tippy.css';
        document.head.appendChild(link);
      }

      // Delay to ensure FullCalendar is rendered before calling tippy
      setTimeout(() => {
        if (window.tippy) {
          window.tippy('[data-tippy-content]');
        }
      },);
    };

    loadTippy();
  }, []);

  useEffect(() => {
    const allEventsStore = allEvents;
    if (showSchedules !== true) {

      const addEventsWithoutResource = allEventsStore.filter(prev => prev.extendedProps.isResource !== true)
      calendarApi?.current?.removeAllEvents();
      calendarApi?.current?.addEventSource(addEventsWithoutResource);
    }
    else {
      setAllEvents(allEventsStore);
      calendarApi?.current?.removeAllEvents();
      calendarApi?.current?.addEventSource(allEventsStore)
    }
  }, [showSchedules])


  useEffect(() => {
    setReadings([...globalThis.C_E])
  }, []);

  useEffect(() => {
    globalThis['defaultplaylists']


    globalThis['readings'] = readings;
    return () => {
      globalThis['AddReadingPlans'] = null;
      globalThis['readings'] = null;

      
    };
  });

  useEffect(() => {
    applyFilterByReinit();
  }, [selectedTypes, calendarView]);

  useEffect(() => {
    readings.forEach(evt => {

      const existing = calendarApi.current.getEventById(evt.id);
      if (!existing) {
        calendarApi.current.addEvent(evt);
      }
    });
    return () => {
      // Optional cleanup if readings change or component unmounts
      readings.forEach(evt => {
        const existing = calendarApi.current.getEventById(evt.id);
        if (existing) {
          existing.remove();
        }
      });
    };
  }, [readings]);




  useEffect(() => {

    if (!calendarApi.current) return;

    const currentYear = new Date().getFullYear();
    const endYear = currentYear + 10;
    const holidays = getHolidaysForRange(currentYear, endYear);
    console.log(holidays, "holidays");

    // Remove existing holiday events directly
    calendarApi.current.getEvents()
      .filter(event => event.extendedProps?.isHoliday)
      .forEach(event => event.remove());

    if (showHolidays && holidays.length > 0) {
      // Mark events as holidays
      holidays.forEach(event => {
        event.extendedProps = { ...(event.extendedProps || {}), isHoliday: true };
      });
      calendarApi.current.addEventSource(holidays);
    }
  }, [showHolidays]);




  useEffect(() => {
    console.log("Updated resourcesByDate:", resourcesByDate);
  }, [resourcesByDate]);
  useEffect(() => {
    resourceGroupNameRef.current = resourceGroupName

  }, [resourceGroupName])


  //handles
  const handleToggleSetting = () => setOpenSetting(prev => !prev);
  const handleSelectionClicking = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  function onToolbarDateClick1(e) {
    const titleEl = e.target.closest('.fc-toolbar-title');
    if (!titleEl) return;
    Object.assign(
      titleEl.style, {
      color: '#303133',
      fontSize: 'medium',
      fontWeight: '400',
      transform: 'translateY(3px)',
      display: 'inline-block',
    });
    const parsed = new Date(titleEl.textContent);
    const iso = isNaN(parsed) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
    const input = document.createElement('input');
    input.type = 'date'; input.value = iso;
    input.style.minWidth = '${ titleEl.offsetWidth } px';
    input.style.fontSize = window.getComputedStyle(titleEl).fontSize;
    input.style.padding = '2px';
    titleEl.replaceWith(input);
    input.focus();
    const finish = () => {
      if (input.value) calendarApi.current.gotoDate(input.value);
      input.replaceWith(titleEl);
    };
    input.addEventListener('blur', finish, { once: true });
    input.addEventListener('keydown', ke => ke.key === 'Enter' && input.blur(),
      { once: true });
  }





  function onToolbarDateClick(e) {
    const titleEl = e.target.closest('.fc-toolbar-title');
    if (!titleEl) return;

    const calendar = calendarApi.current;


    const existing = document.querySelector('.custom-range-container');
    if (existing) {
      existing.replaceWith(titleEl); // restore title if still mounted
      return; // stop creating multiple
    }

    const originalTitle = titleEl.textContent;


    // create container
    const container = document.createElement('div');
    container.className = 'custom-range-container';
    container.style.display = 'flex';
    container.style.gap = '6px';
    container.style.alignItems = 'center';

    // start input
    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.value = calendar.view.currentStart.toLocaleDateString('en-CA');

    // end input
    const endInput = document.createElement('input');
    endInput.type = 'date';
    endInput.value = calendar.view.currentEnd.toLocaleDateString('en-CA');

    // ok button
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.padding = '2px 6px';
    okBtn.style.cursor = 'pointer';

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

    okBtn.addEventListener('click', finish);

    // escape key cancels
    const handleKey = (ke) => {
      if (ke.key === 'Escape') {
        container.replaceWith(titleEl);
        titleEl.textContent = originalTitle;
      }
    };

    startInput.addEventListener('keydown', handleKey);
    endInput.addEventListener('keydown', handleKey);

    startInput.focus();
  }




  const getButtonStyle = (type) => ({
    backgroundColor: selectedTypes.includes(type) ? "#D36433" : "#F2F2F2",
    color: selectedTypes.includes(type) ? "white" : "black",
  });

  const onEventsClick = () => {
    setEventViewSelected(prev => !prev)
  }
  const onMapCick = () => {
    setMapViewSelected(prev => !prev)
    setOpenMap(true)
  }
  const handleDelete = (id) => {
    setReadings(prev => prev.filter(item => item.id !== id));
    setEventInView(prev => prev.filter(ev => ev.id !== id));
    const evt = calendarApi.current.getEventById(id);
    setAllEvents(prev => prev.filter(ev => ev.id !== id));
    if (evt) evt.remove();
  }
  const handleEditing = (id, isResource) => {


    const evt = calendarApi.current.getEventById(id);
    setEditingEvent(evt);
    setEditEventOpen(true);
  }

  const addReadingPlans = (selected) => {
    const playLists = selected.reduce((acc, item) => acc.concat({ list: item.list, playList: item.name }), []);
    setReadingsList(prev => [...prev, ...playLists]);

    let start;
    if (playLists[0]?.list[0]?.type !== 'date') {
      start = new Date();
    }
    const newEvents = [];


    playLists.forEach(item => {
      const playList = item.playList;
      let list = [];

      item.list.forEach(itm => {
        if (itm.type === 'date') {
          list = [];
          start = parseDashedDateToValidDate(itm.content);
        } else {
          const value = itm.content.replace(/Genesis/g, 'GEN');

          list.push(value);
          const eventDate = start;

          const eventTitle = playList;

          const isDuplicate = newEvents.some(e =>
            e.title === eventTitle && new Date(e.start).toDateString() === eventDate.toDateString()
          );



          if (!isDuplicate) {
            newEvents.push({
              title: eventTitle,

              start: eventDate,

              id: uuid(),
              isReadingPlan: true,
              classNames: ['readingPlan'],
              color: 'white',
              extendedProps: { startTime: '', endTime: '', isReapeating: false, type: "reading" },


              allDay: true,
              source: 'reading',

              description: `Reading from playlist: ${playList}`
            });
          }
        }
      });
    });

    if (newEvents.length > 0) {
      globalThis.C_E.push(...newEvents);
      const list = [];

      newEvents.forEach(item => {
        const isDuplicate = readings.some(
          e =>
            e.title === item.title &&
            new Date(e.start).toDateString() === new Date(item.start).toDateString()
        );

        if (!isDuplicate) {
          list.push(item);
        }
      });
      setEventInView(prev => {
        const combined = [...prev, ...list];

        combined.sort((a, b) => new Date(a.start) - new Date(b.start));
        return combined;
      });
      setAllEvents(prev => [...prev, ...list])
      setSelectedTypes(prev => ['reading', ...prev]);


      setReadings(prev => [...list, ...prev]);

    } else {
      return

    }
  };


  globalThis.OpenSelf = async function () {

    if (!globalThis.makingPlaylist) {
      if (globalThis["Playlist_package"]) {
        globalThis["Playlist_package"].onClick();
      } else {

        const PlayList = await Playlist.tryInitPlaylistMaker();
        if (PlayList) {
         
          const id = uuid();
          globalThis.PLAYLIST_PANEL_ID = id;


          AddApplication({
            id,
            App: <PlayList id={id} />,
            to: "panel",
            minWidth: "23rem",
          });
        }
      }
    }
  };





  const getMaxColumnsFromContainer = () => {
    const container = document.querySelector('.experience-container');
    const width = container?.clientWidth || 1200; // fallback


    if (width <= 600) return 2;
    if (width <= 1100) return 3;
    return 4;
  };
  function formatWeekdayDay(date) {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric'
    }).format(date);
  }

  // 2️⃣ Build tooltip content
  function createMiniModalContent(weekdayDay, eventTitle) {
    return `
    <div style="
      padding: 8px;
      max-width: 200px;
      text-align: center;
      background: #f4f7f8;
      color: blue;
      font-size: 14px;
    ">
      <strong>${weekdayDay}</strong><br>
      <small>${eventTitle}</small>
    </div>`;
  }
  function onRangeChange(viewStart, viewEnd) {
    if (calendarApi.current !== null) {
      const allEvents = calendarApi.current.getEvents();

      const visibleEvents = allEvents.filter(event => {
        const evStart = event.start;
        const evEnd = event.end || evStart;
        return evEnd > viewStart && evStart < viewEnd;
      });
      return visibleEvents;
    }
  }
  const visibleEvents = eventInView
    .filter(ev => selectedTypes.includes(ev.extendedProps.type) && ev.extendedProps.isResource !== true)
    .slice(0, visibleCount);
  const containerEl = document.querySelector('.experience-container');
  if (containerEl) {
    const observer = new ResizeObserver(() => {
      updateTodayButtonLabel();
    });
    observer.observe(containerEl);
  }
  const applyFilterByReinit = () => {
    if (!calendarApi.current) return;

    const filteredEvents = allEvents.filter(ev =>
      selectedTypes.includes(ev.extendedProps.type)
    );

    calendarApi.current.removeAllEvents();
    calendarApi.current.addEventSource(filteredEvents);


  };
  useEffect(() => {
    resourcesRef.current = resourcesByDate;
  }, [resourcesByDate]);
  useEffect(() => {
    resourceIdRef.current = currentResourceId

  }, [currentResourceId])


  useEffect(() => {
    if (calendarApi.current !== null) {
      if (calendarApi.current.view.type === 'resourceTimeline') {
        setIsSchedule(true);
      }
      else {
        setIsSchedule(false);
      }
    }
  })
  console.log(resourcesRef.current, 'resourcesref')
  console.log(isResourceGroupHiding, 'isresourcegrouphiding')
  useEffect(() => {


    const link = document.createElement('link');
    const container = document.querySelector('.experience-container');
    link.href = 'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    if (calendarRef.current) {
      setIsReady(true);
      const calendarEle = document.getElementById('calendar');
      calendarApi.current = new FullCalendar.Calendar(calendarRef.current, {
        schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
        headerToolbar: {
          left: 'prev,next,today,title',
          center: '',
          right: ''
        },
        buttonText: {
          today: ' '
        },
        customButtons: {
          viewDropdown: {
            click: () => { },
          },
          customToday: {
            text: calendarEle.offsetWidth > 500 ? 'Today' : 'T', // default label; we’ll update it on resize
            click: () => {
              calendarApi.current.today();
            }
          }

        },
        dayMaxEvents: 3,
        dayHeaderFormat: getDayHeaderFormat(calendarEle.offsetWidth, 'dayGridMonth'),

        views: {

          multiMonthYear: {
            type: 'multiMonth',
            duration: { months: 12 },
            labelFormat: { year: 'numeric' },
            multiMonthMaxColumns: getMaxColumnsFromContainer(),
            multiMonthMinWidth: 120,
            dayHeaderFormat: { weekday: 'narrow' },
            eventDisplay: 'none',

          },

          customResourceRange: {
            type: "resourceTimeline",
            duration: { days: 7 }, // default to 7 days
            buttonText: "Custom Range",
          }

        },

        slotMinTime: '00:00:00',
        slotMaxTime: '25:00:00',
        slotDuration: '00:30:00',
        scrollTime: '07:00:00',
        initialView: 'dayGridMonth',
        /* moreLinkClick: (arg) => {
           const existingPopover = document.querySelector(".custom-popover");
 
           if (existingPopover && existingPopover.dataset.date === arg.dateStr) {
             existingPopover.remove();
             return;
           }
 
           document.querySelectorAll(".custom-popover").forEach(p => p.remove());
 
           const date = arg.date;
           const eventsForDate = arg.view.calendar.getEvents().filter(ev =>
             new Date(ev.start).toDateString() === new Date(date).toDateString()
           );
           if (!eventsForDate.length) return;
 
           const popover = document.createElement("div");
           popover.className = "custom-popover";
           popover.dataset.date = arg.dateStr;
 
           Object.assign(popover.style, {
             position: "absolute",
             background: "#fff",
             border: "1px solid #ccc",
             borderRadius: "8px",
             padding: "6px 8px",
             zIndex: 10000,
             boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
             minWidth: "150px",
             maxWidth: "180px",
             maxHeight: "220px",
             overflowY: "auto",
             fontFamily: "Inter, sans-serif",
             fontSize: "12px",
           });
 
           const header = document.createElement("div");
           const dateObj = new Date(arg.date);
           const options = { weekday: "short", month: "short", day: "numeric" };
           header.innerText = dateObj.toLocaleDateString("en-US", options);
           Object.assign(header.style, {
             fontWeight: "600",
             marginBottom: "6px",
             textAlign: "center",
             textTransform: "capitalize",
             borderBottom: "1px solid #eee",
             paddingBottom: "4px",
             fontSize: "12px",
           });
           popover.appendChild(header);
 
           eventsForDate.forEach(ev => {
             const div = document.createElement("div");
             const title =
               ev.title.charAt(0).toUpperCase() + ev.title.slice(1).toLowerCase();
             div.innerText = title;
             Object.assign(div.style, {
               backgroundColor: "#007bff",
               color: "white",
               borderRadius: "5px",
               padding: "4px 6px",
               marginBottom: "4px",
               textAlign: "center",
               cursor: "pointer",
               fontSize: "11px",
             });
 
             div.addEventListener("mouseenter", () => {
               div.style.backgroundColor = "#0056b3";
             });
             div.addEventListener("mouseleave", () => {
               div.style.backgroundColor = "#007bff";
             });
 
             popover.appendChild(div);
           });
 
           document.body.appendChild(popover);
 
           const { pageX, pageY } = arg.jsEvent;
           popover.style.top = `${pageY - 20}px`;
           popover.style.left = `${pageX - 5}px`;
 
           const popRect = popover.getBoundingClientRect();
           if (popRect.right > window.innerWidth) {
             popover.style.left = `${window.innerWidth - popRect.width - 10}px`;
           }
           if (popRect.bottom > window.innerHeight) {
             popover.style.top = `${window.innerHeight - popRect.height - 10}px`;
           }
 
           const removePopover = (e) => {
             const isInsidePopover = popover.contains(e.target);
             const isMoreBtn = e.target.closest(".fc-daygrid-more-link");
             if (!isInsidePopover && !isMoreBtn) {
               popover.remove();
               document.removeEventListener("mousedown", removePopover);
             }
           };
 
           setTimeout(() => {
             document.addEventListener("mousedown", removePopover);
           }, 0);
         }
 
 
         ,*/
        moreLinkClick: (arg) => {
          popoverOpen = true;
          return 'popover';
        },







        resourceAreaHeaderContent: function () {
          const wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.justifyContent = 'space-between';
          wrapper.style.alignItems = 'center';

          const label = document.createElement('span');
          label.textContent = 'Schedule';

          const addButton = document.createElement('button');
          addButton.textContent = '+';
          addButton.style.marginLeft = '8px';
          addButton.style.fontSize = "8px"
          addButton.style.paddin = '0 0';

          addButton.title = 'Add New Group';
          addButton.style.cursor = 'pointer';

          addButton.onclick = () => {
            setIsModalOpen(true)
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{arg.groupValue}</span>
              <button

                ref={(el) => {
                  if (el) el.dataset.groupValue = arg.groupValue;
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
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
        }

        ,

        resourceGroupField: isResourceGroupHiding ? undefined : 'group',

        allDaySlot: true,
        allDayText: 'All day',
        expandRows: true,
        contentHeight: '400px',
        eventContent: function (arg) {
          const isSchedule = arg.event.extendedProps.isResource === true;
          const eventType = arg.event.extendedProps.type;
          const container = document.querySelector(".experience-container");
          const isNarrow = container && container.offsetWidth < 500;
          const isPopoverOpen = popoverOpen;

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

          // Compact mode (mobile, no popover)
          if (isNarrow && !isPopoverOpen) {
            if (isSchedule) return { html: "" };
            if (eventType === "reading") return { html: makeDot("#20c997") };
            return { html: makeDot("#339af0") };
          }

          // Popover open — show full event
          if (isPopoverOpen) {
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
            <span>${arg.event.title}</span>
          </div>
        `,
            };
          }

          // Normal schedule
          if (isSchedule) {
            return {
              html: `
         <div style="
          display:flex;align-items:center;
          background:#e7f5ff;color:#1c3d5a;
          border:1px solid #74c0fc;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;text-overflow:ellipsis;">
          <span>${arg.event.title}</span>
        </div>
        `,
            };
          }

          // Reading events
          if (eventType === "reading") {
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
            <span>${arg.event.title}</span>
          </div>
        `,
            };
          }

          // Default event style
          return {
            html: `
        <div style="
          display:flex;align-items:center;
          background:#e7f5ff;color:#1c3d5a;
          border:1px solid #74c0fc;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;text-overflow:ellipsis;">
          <span>${arg.event.title}</span>
        </div>
      `,
          };
        },
        eventClassNames: function (arg) {
          const width = document.querySelector('.experience-container')?.offsetWidth || 0;
          const popover = document.querySelector('.fc-popover');


          const start = new Date(arg.event.start);
          const end = new Date(arg.event.end || arg.event.start);


          const isMultiDay = start.toDateString() !== new Date(end.getTime() - 1).toDateString();

          if (width <= 500) {
            return ['dot-view'];
          }
          else {
            return ['full-view'];
          }
        },
        dayCellDidMount: (info) => {
          const cellDateStr = info.date.toISOString().split('T')[0];
          const hasEvent = calendarApi.current.getEvents().some(ev => {
            const evDateStr = new Date(ev.start).toISOString().split('T')[0];
            return evDateStr === cellDateStr;
          });

          // Only apply in multiMonthYear view
          const isMultiMonth = calendarApi.current?.view?.type === 'multiMonthYear';
          if (hasEvent && isMultiMonth) {
            info.el.style.backgroundColor = 'white'; // dark gray

          }
        },



        editable: true,
        droppable: true,
        resourceAreaWidth: '180px',

        displayEventTime: false,
        eventDisplay: 'block',        // No time text

        dateClick: async function (info) {
          console.log(resourcesByDate, 'jhjhjhjhjh');
          if (info.jsEvent?.target.closest('.tippy-box')) return;
          const date = info.date;
          if (!calendarApi) {
            return;
          }
          if (info.view.type === 'resourceTimeline') {
            const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            const endTime = new Date(date);
            endTime.setHours(endTime.getHours() + 1);
            const endStr = endTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            const container = document.querySelector(".experience-container");
            const rect = container.getBoundingClientRect();
            const clickX = info.jsEvent.clientX - rect.left;
            const clickY = info.jsEvent.clientY - rect.top;
            setIsEventModalOpen(true);
            setResourceDate(date.toISOString().split('T')[0])
            setCurrentResourceId(info?.resource.id || null);
            setResorceTime(timeStr);
            setResourceETime(endStr);
            setModalPosition({ x: clickX, y: clickY });






          }


          if (info.view.type !== 'multiMonthYear' && info.view.type !== 'resourceTimeline') {
            console.log('no-multimonth');


            showEventPopup(info, setPlaylistMode, setScheduleTitle, setScheduleDescription, addReadingPlans, playlistsToAdd, setPlaylistsToAdd, calendarApi, setCalendarView, ({ title, description, link, start, end, startTime, endTime, recurVal, isPlansTabActive }) => {

              console.log(isPlansTabActive, 'hghghgh');
              if (isPlansTabActive) return;


              let newEvent;
              console.log(start, end, 'aada')
              const days = getDayDifference(start, end);


              if (recurVal.charAt(0) === 'N') {
                const isTimed = startTime && endTime;
                console.log(isTimed,)
                if (days === 0) {

                  newEvent = {
                    title: title ? title : 'easter',
                    id: uuid(),
                    start: isTimed ? `${start}T${startTime}:00` : start,
                    end: isTimed ? `${end}T${endTime}:00` : end,
                    allDay: isTimed ? false : true,
                    color: 'white',
                    eventDisplay: 'list-item',

                    theme: 'simple-borderless',


                    classNames: ['user-event'],
                    extendedProps: { description, link, startTime, endTime, isReapeating: false, type: "events" }
                  };
                  const now = stripTime(new Date());
                  const startDate = stripTime(new Date(newEvent.start));
                  setAllEvents(prev => [...prev, newEvent])
                  if (newEvent) {
                    setSelectedTypes(prev => ['events', ...prev])

                  }

                  if (startDate >= now) {
                    setEventInView(prev => {
                      const combined = [...prev, newEvent];
                      combined.sort((a, b) => new Date(a.start) - new Date(b.start));
                      return combined;
                    });
                  }


                  calendarApi.current.addEvent(newEvent);
                }
                else {
                  newEvent = {
                    title: title ? title : 'easter',
                    id: uuid(),
                    start: isTimed ? `${start}T${startTime}:00` : start,
                    end: isTimed ? `${end}T${endTime}:00` : end,
                    allDay: isTimed ? false : true,
                    color: 'white',


                    theme: 'simple-borderless',


                    classNames: ['user-event'],
                    extendedProps: { description, link, startTime, endTime, isReapeating: false, type: "events" }
                  };
                  const now = stripTime(new Date());
                  const startDate = stripTime(new Date(newEvent.start));


                  if (startDate >= now) {
                    setEventInView(prev => {
                      const combined = [...prev, newEvent];
                      combined.sort((a, b) => new Date(a.start) - new Date(b.start));
                      return combined;
                    });
                  }
                  if (newEvent) {
                    setAllEvents(prev => [...prev, newEvent])
                    setSelectedTypes(prev => ['events', ...prev])

                  }
                  calendarApi.current.addEvent(newEvent);
                }


              }

              else {
                if (recurVal.charAt(0) === 'R') {
                  const isTimed = startTime && endTime;

                  const words = recurVal.split(" ");
                  const thirdWord = words[2];
                  const day = dayNameToNumber(thirdWord);
                  newEvent = {
                    title: title ? title : 'easter',
                    id: uuid(),
                    start: isTimed ? `${start}T${startTime}:00` : start,
                    end: isTimed ? `${end}T${endTime}:00` : end,
                    daysOfWeek: [day],
                    allDay: isTimed ? false : true,
                    color: 'white',

                    theme: 'simple-borderless',


                    classNames: ['user-event'],
                    extendedProps: { description, link, startTime, endTime, isReapeating: true, type: "events" }
                  };
                  const now = stripTime(new Date());
                  const startDate = stripTime(new Date(newEvent.start));
                  setAllEvents(prev => [...prev, newEvent])

                  if (startDate >= now) {
                    setEventInView(prev => {
                      const combined = [...prev, newEvent];
                      combined.sort((a, b) => new Date(a.start) - new Date(b.start));
                      return combined;
                    });
                  }
                  if (newEvent) {
                    setSelectedTypes(prev => ['events', ...prev])

                  }

                  calendarApi.current.addEvent(newEvent);


                }
                else {
                  if (recurVal.charAt(0) === 'c') {


                    newEvent = {
                      title: title ? title : 'easter',
                      id: uuid(),
                      daysOfWeek: customDaysRef.current,              // Monday and Wednesday
                      start: start,

                      end: end,
                      color: 'white',
                      allDay: true,
                      theme: 'simple-borderless',
                      classNames: ['user-event'],
                      extendedProps: { description, link, isReapeating: true, type: "events" }
                    };
                    const now = stripTime(new Date());
                    const startDate = stripTime(new Date(newEvent.start));
                    setAllEvents(prev => [...prev, newEvent])

                    if (startDate >= now) {
                      setEventInView(prev => {
                        const combined = [...prev, newEvent];
                        combined.sort((a, b) => new Date(a.start) - new Date(b.start));
                        return combined;
                      });
                    }
                    if (newEvent) {
                      setSelectedTypes(prev => ['events', ...prev])

                    }

                    calendarApi.current.addEvent(newEvent);
                  }
                }

              }

            });
          }
          else {
            if (info.view.type !== 'resourceTimeline') {

              const clickedDate = info.date;
              // JS Date

              const isoStr = info.dateStr;            // "YYYY-MM-DD"
              const weekdayDay = formatWeekdayDay(clickedDate);

              const events = calendarApi.current.getEvents();
              const matched = events.filter(ev => {
                const clickedDateLocal = info.date.toLocaleDateString('en-CA');
                const eventDateLocal = ev.start.toLocaleDateString('en-CA');
                return clickedDateLocal === eventDateLocal;
              });
              console.log(matched, 'kjkjkj');
              const eventTitle = matched.length > 0
                ? matched.map(ev => ev.title).join(', ')
                : 'No Event';

              const referenceEl = info.dayEl;
              const html = createMiniModalContent(weekdayDay, eventTitle);

              // 4️⃣ Initialize & show tippy
              const instance = tippy(referenceEl, {
                content: html,
                allowHTML: true,
                theme: 'my-custom',
                arrow: true,
                interactive: true,
                placement: 'auto',
                delay: [100, 0],
                duration: [300, 200],
                maxWidth: 300,
                hideOnClick: true,
                trigger: 'manual',
                appendTo: () => document.body,
                zIndex: 9999,

              });
              instance.show();
            }

          }

        },

        datesSet: (info) => {
          calendarApi.current.removeAllEvents();
          calendarApi.current.addEventSource(allEvents);

          const startDate = new Date(info.startStr).toLocaleDateString('en-CA');

          const newResources = resourcesRef.current[startDate] || [];

          calendarApi.current.setOption("resources", newResources);

          updateCalendarHeader(calendarApi.current);

          const { start, end } = info;


          setCalendarTitle(info.view.title);
          setCalendarView(calendarApi.current.view.type);
          const todayBtn = calendarRef.current.querySelector('.fc-today-button');
          const addButton = document.getElementById('add-event-button');
          const prevBtn = calendarRef.current.querySelector('.fc-prev-button');
          const nextBtn = calendarRef.current.querySelector('.fc-next-button');
          let select = document.getElementById('view-toggle-select');
          if (info.view.type === 'resourceTimelineDay') {
            if (todayBtn) todayBtn.style.display = 'none';
            if (addButton) addButton.style.display = 'none';
            if (select) select.style.display = 'none';



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

            if (addButton) addButton.style.display = 'inline-block';
            if (select) select.style.display = 'inline-block';


            if (prevBtn) prevBtn.style.pointerEvents = "auto";
            if (nextBtn) nextBtn.style.pointerEvents = "auto";
          }




          const events = onRangeChange(start, end);
          const sortedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
          setEventInView(sortedEvents);


          const styleButtons = () => {






            if (prevBtn) {
              Object.assign(prevBtn.style, {
                backgroundColor: 'white',
                color: 'black',
                fontSize: '10px',
                padding: "0",
                border: 'none',
                marginRight: '10px',

                alignSelf: 'center',
                cursor: info.view.type === 'resourceTimelineDay' ? 'not-allowed' : 'pointer',
                opacity: info.view.type === 'resourceTimelineDay' ? '0.5' : '1',
              });
              prevBtn.onfocus = prevBtn.onmousedown = () => {
                prevBtn.style.outline = 'none';
                prevBtn.style.boxShadow = 'none';
              };
            }

            if (nextBtn) {
              Object.assign(nextBtn.style, {
                backgroundColor: 'white',
                color: 'black',
                fontSize: '10px',
                padding: "0",
                border: 'none',
                marginRight: '10px',
                cursor: info.view.type === 'resourceTimelineDay' ? 'not-allowed' : 'pointer',
                opacity: info.view.type === 'resourceTimelineDay' ? '0.5' : '1',
              });
              nextBtn.onfocus = nextBtn.onmousedown = () => {
                nextBtn.style.outline = 'none';
                nextBtn.style.boxShadow = 'none';
              };
            }


            if (todayBtn) {
              if (info.view.type.includes('resourceTimeline')) {
                todayBtn.style.display = 'none';
              } else {

                todayBtn.style.display = 'inline-block';
                Object.assign(todayBtn.style, {
                  backgroundColor: 'white',
                  textTransform: 'capitalize',
                  color: '#606266',
                  fontWeight: '300',
                  fontSize: '15px',
                  marginRight: '10px',
                  border: '1px solid #d3d3d3',
                  padding: '4px 16px',
                  cursor: 'pointer',
                });
                todayBtn.onfocus = todayBtn.onmousedown = () => {
                  todayBtn.style.outline = 'none';
                  todayBtn.style.boxShadow = 'none';
                };
              }


            }
          };




          const toolbar = calendarRef.current.querySelector('.fc-toolbar');

          if (toolbar) {

            if (activeToolbarHandler) {
              toolbar.removeEventListener('click', activeToolbarHandler);
            }


            if (info.view.type === 'resourceTimeline') {
              activeToolbarHandler = onToolbarDateClick;
            } else {
              activeToolbarHandler = onToolbarDateClick1;
            }


            toolbar.addEventListener('click', activeToolbarHandler);
          }



          const rightHeaderEl = calendarRef.current.querySelector(
            '.fc-header-toolbar .fc-toolbar-chunk:last-child'
          );

          if (rightHeaderEl) {
            Object.assign(rightHeaderEl.style, {
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: '10px',
              justifyContent: 'flex-end',
            });



            let addButton = document.getElementById('add-event-button');
            if (info.view.type.includes('resourceTimeline')) {
              addButton.style.display = 'none';
            } else {
              if (!addButton) {
                addButton = document.createElement('button');
                addButton.id = 'add-event-button';
                addButton.innerHTML = `
                
          
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
               xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
            <path d="M9.95441 4.16602V15.8327" stroke="white" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.12109 10H15.738" stroke="white" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Add Event</span> `;
                Object.assign(addButton.style, {
                  display: 'flex',
                  alignItems: 'center',      // vertical center
                  justifyContent: 'center',  // keep icon + text grouped
                  gap: '6px',                // space between icon and text
                  backgroundColor: '#D36433',
                  color: 'white',
                  fontSize: '14px',
                  fontFamily: 'Satoshi',
                  fontWeight: '400',
                  border: 'none',
                  borderRadius: '8px',
                  marginLeft: '20px',
                  padding: '6px 6px',
                  cursor: 'pointer',
                  lineHeight: '1',           // ensures no extra vertical space
                });

                addButton.addEventListener('click', () => setModalOpen(true));
              }
              rightHeaderEl.appendChild(addButton);
            }



            if (info.view.type.includes('resourceTimeline')) {
              select.style.display = 'none';
            } else {


              if (!select) {

                select = document.createElement('select');
                select.id = 'view-toggle-select';
                Object.assign(select.style, {
                  marginLeft: '10px',
                  padding: '4px 6px 2px 4px',
                  fontSize: '14px',
                  fontFamily: 'Satoshi',
                  color: '#606266',
                  border: '1px solid #d3d3d3',
                  borderRadius: '0',
                  transform: 'translateY(3px)',
                  cursor: 'pointer',
                });

                select.addEventListener('change', (e) => {
                  const v = e.target.value;
                  if (v) calendarApi.current.changeView(v);
                });
              }

              rightHeaderEl.insertBefore(select, document.getElementById('add-event-button'));
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

            const todayBtn = calendarEl.querySelector('.fc-today-button');
            if (todayBtn && !info.view.type.includes('resourceTimeline')) {
              todayBtn.textContent = width < 500 ? 'T' : 'Today';
            }

            const viewSelect = document.getElementById('view-toggle-select');
            if (viewSelect) {
              const d = viewSelect.querySelector('option[value="timeGridDay"]');
              const w = viewSelect.querySelector('option[value="timeGridWeek"]');
              const m = viewSelect.querySelector('option[value="dayGridMonth"]');
              const y = viewSelect.querySelector('option[value="multiMonthYear"]');
              if (d) d.text = width < 550 ? 'D' : 'Daily';
              if (w) w.text = width < 550 ? 'W' : 'Weekly';
              if (m) m.text = width < 550 ? 'M' : 'Monthly';
              if (y) y.text = width < 550 ? 'Y' : 'Yearly';
            }

            const addBtn = document.getElementById('add-event-button');
            if (addBtn && !info.view.type.includes('resourceTimeline')) {
              addBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M9.95441 4.16602V15.8327" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.12109 10H15.738" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
              if (width >= 550) {
                const span = document.createElement('span');
                span.innerText = 'Add Event';
                span.style.marginLeft = '6px';
                span.style.transform = 'translateY(-10px)';
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
          let readingsLists = [];
          const { title, extendedProps, start, id } = info.event;
          console.log(start, 'jjjj')

          const { type: eventType, isResource, description, link, readingPlans } = extendedProps;

          const formattedDate = start.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }).replace(/ /g, '-');

          const formattedTime = start.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const wrapper = document.createElement('div');

          // Options (Edit/Delete/Close)
          const options = document.createElement('div');
          options.style.cssText = `
    display: flex;
    gap: 3px;
   
    top: 2px;
    transform: translate(115px,-10px);
    right: 2px;
  `;

          // Delete button
          const dlt = document.createElement('span');
          dlt.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20" class="icon-btn">
    <path d="M6 2a1 1 0 0 0-1 1v1h10V3a1 1 0 1 0-2 0h-6a1 1 0 0 0-1-1zM5 6h10l-.603 9.04A2 2 0 0 1 12.405 17H7.595a2 2 0 0 1-1.992-1.96L5 6z"/>
  </svg>`;
          dlt.style.color = 'gray';
          dlt.addEventListener('click', () => {
            wrapper.remove();
            handleDelete(id)});

          // Edit button
          const edit = document.createElement('span');
          edit.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" class="icon-btn">
    <path d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345L15.7238 5.72328C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865C16.3351 6.57602 16.335 6.75631 16.2807 6.92368C16.2189 7.11382 16.054 7.27865 15.7245 7.60819L15.7238 7.6089L13.3332 9.99944M9.99992 6.66611L13.3332 9.99944" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
          edit.style.color = 'gray';
          edit.addEventListener('click', () => {
            wrapper.remove();
            const popover = document.querySelector('.fc-popover');
            if (popover) {
              popover.remove();
            }
            handleEditing(id, isResource)
          });

          // Close button
          const close = document.createElement('span');
          close.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20" class="icon-btn">
    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/>
  </svg>`;
          close.style.color = 'gray';
          close.addEventListener('click',()=>wrapper.remove());

          options.appendChild(dlt);
          options.appendChild(edit);
          options.appendChild(close);

          // Reading Plans Section
          console.log(readingsRef.current);
          console.log(globalThis['defaultplaylists'], 'redings');

          readingsLists = globalThis['defaultplaylists'].filter(item => item.name === title);

          const parentId = 'default'
          const playingPlaylist = readingsLists[0]?.id;
          const playlist = globalThis[`${parentId}playlists`].find(ele => ele.id === playingPlaylist);
          let val;
          if (readingsLists.length > 0) {
            const readaingsToAdd = readingsLists[0].list.filter(item => {

              if (item.type === 'date') {
                val = item.content;
              }
              console.log(start, val);
              if (isSameDate(start, val) & item.type !== 'date') {
                ;
                return item;
              }

            })
            console.log(readaingsToAdd);






            if (readingsLists && readingsLists.length > 0) {
              const plansSection = document.createElement('div');


              const heading = document.createElement('div');
              heading.textContent = '📚 Reading Plans';
              heading.style.cssText = `
      font-weight: 500;
      
      color: #3c4043;
    `;
              plansSection.appendChild(heading);

              const ul = document.createElement('ul');
              ul.style.cssText = 'padding-left: 0; margin: 0; list-style: none;';

              readaingsToAdd.forEach(plan => {

                if (plan.type !== 'date') {
                  const li = document.createElement('li');
                  const button = document.createElement('button');
                  button.textContent = plan.content;
                  button.dataset.plan = plan;
                  button.style.cssText = `
        display: inline-block;
        background-color: #e8f0fe;
        color: #1967d2;
        border: none;
        padding: 6px 12px;
        margin: 4px 0;
        border-radius: 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
      `;
                  button.addEventListener('click', () => alert(`You clicked: ${plan}`));
                  li.appendChild(button);
                  ul.appendChild(li);
                }
              });
              // Create the container div
              const playButtonCon = document.createElement('div');

              // Apply styling (optional)
              playButtonCon.style.display = 'flex';
              playButtonCon.style.alignItems = 'center';
              playButtonCon.style.gap = '3px';
              playButtonCon.style.cursor = 'pointer';
              playButtonCon.style.padding = '2px 4px';
              playButtonCon.style.borderRadius = '8px';
              playButtonCon.style.background = '#1e88e5';
              playButtonCon.style.color = '#fff';
              playButtonCon.style.fontFamily = 'sans-serif';
              playButtonCon.style.fontWeight = '400';
              playButtonCon.style.width = 'fit-content';
              playButtonCon.style.fontSize = '10px'

              // Add SVG Play icon
              playButtonCon.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6,4 20,12 6,20"></polygon>
  </svg>
  <span>Play Playlist</span>
`;


              playButtonCon.addEventListener('mouseenter', () => {
                playButtonCon.style.background = '#1565c0';
              });
              playButtonCon.addEventListener('mouseleave', () => {
                playButtonCon.style.background = '#1e88e5';
              });
              playButtonCon.addEventListener("click", async () => {
                if (!playlist) {
                  console.error("Playlist not found");
                  return;
                }
                
                globalThis.OpenSelf();
                await os.sleep(100);

                Playlistplaying({
                  playingPlaylist: playlist.id,
                  startIndex: 0,
                  startSubIndex: -1,
                  parentId: "default",
                  name: playlist.name || "Untitled Playlist",
                  list: [...playlist.list],
                });
              });



              document.body.appendChild(playButtonCon);



              plansSection.appendChild(ul);
              wrapper.style.position = 'relative';
              wrapper.style.padding = '12px';
              wrapper.style.width = '190px'

              plansSection.appendChild(playButtonCon)
              wrapper.appendChild(options)
              wrapper.appendChild(plansSection);
            }
          } else {
            // Regular event section
            wrapper.style.position = 'relative';
            wrapper.style.padding = '12px';
            wrapper.style.width = '180px'
            wrapper.appendChild(options);

            const container = document.createElement('div');
            container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

            const titleContainer = document.createElement('div');
            titleContainer.style.display = 'flex';
            titleContainer.style.alignItems = 'center';
            titleContainer.style.gap = '8px';
            titleContainer.style.marginBottom = '12px';

            const greenDot = document.createElement('div');
            Object.assign(greenDot.style, {
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: isResource ? '#f1c40f' : '#87ceeb',
            });

            const titleELC = document.createElement('div');
            titleELC.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1px;
    `;

            const titleEl = document.createElement('div');
            titleEl.textContent = title || 'Untitled Event';
            Object.assign(titleEl.style, {
              fontSize: '16px',
              fontWeight: '800',
              color: '#000',
            });

            const date = document.createElement('p');
            date.innerHTML = `<span>${formattedDate} (${formattedTime})</span>`;
            date.style.cssText = `
      font-size: 10px;
      color: black;
      margin-left: 4px;
      transform: translateY(-10px);
    `;

            titleELC.appendChild(titleEl);
            titleELC.appendChild(date);
            titleContainer.appendChild(greenDot);
            titleContainer.appendChild(titleELC);
            container.appendChild(titleContainer);

            // Description
            if (description) {
              const descSection = document.createElement('div');
              descSection.style.marginBottom = '12px';
              descSection.innerHTML = `
        <div style="display:flex; align-items:center; gap:4px;">
          <svg style="color: gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round" class="feather feather-file-text">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <strong style="color:black">${description}</strong>
        </div>
      `;
              container.appendChild(descSection);
            }

            // Link
            if (link) {
              const linkSection = document.createElement('div');
              linkSection.style.display = 'flex';
              linkSection.style.alignItems = 'center';

              const linkIcon = document.createElement('span');
              linkIcon.innerHTML = `<svg style="color:gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" class="feather feather-link">
          <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
          <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
        </svg>`;
              linkSection.appendChild(linkIcon);

              const linkBtn = document.createElement('a');
              linkBtn.href = link;
              linkBtn.target = '_blank';
              linkBtn.textContent = 'Click Here';
              Object.assign(linkBtn.style, {
                marginLeft: '4px',
                color: '#1a73e8',
                textDecoration: 'none',
                fontSize: '14px'
              });

              linkSection.appendChild(linkBtn);
              container.appendChild(linkSection);
            }

            // Resource button
            if (isResource && !calendarApi.current.view.type.includes('resourceTimeline')) {
              const resourceButton = document.createElement('div');
              resourceButton.textContent = 'Go To Schedule';
              Object.assign(resourceButton.style, {
                padding: '2px 3px',
                backgroundColor: '#87ceeb',
                color: 'white',
                width: '200px',
                textAlign: 'center',
                borderRadius: '20px',
                cursor: 'pointer',
              });
              resourceButton.addEventListener('click', (e) => {
                e.preventDefault();
                calendarApi.current.changeView('resourceTimeline');
              });
              container.appendChild(resourceButton);
            }

            wrapper.appendChild(container);
          }

          // Initialize Tippy.js
          /*  if (typeof tippy === 'function') {
              const instance = tippy(info.el, {
                content: wrapper,
                allowHTML: true,
                theme: 'custom',
                arrow: true,
                interactive: true,
                placement: 'auto',
                delay: [100, 0],
                maxWidth: 520,
                trigger: 'click',
                hideOnClick: true,
                onShow(ins) {
                  close.addEventListener('click', () => ins.hide());
                }
              });
             
              setTimeout(() => {
                const isInPopover = info.el.closest('.fc-popover');
                if (isInPopover) {
                  info.el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (instance.state.isShown) {
                      instance.hide();
                    } else {
                      instance.show();
                    }
                  });
                }
              }, 0);
            }
            else {
              console.warn("Tippy.js is not loaded yet!");
            }*/
          info.el.addEventListener("click", (e) => {
            e.stopPropagation();

            // Remove any existing wrapper before adding a new one
            const existing = document.querySelector(".custom-wrapper");
            if (existing) existing.remove();

            // Get event element position
            const rect = info.el.getBoundingClientRect();

            // Style your wrapper
            Object.assign(wrapper.style, {
              position: "absolute",
              top: `${rect.bottom + window.scrollY + 8}px`,
              left: `${rect.left - 150 + window.scrollX}px`,
              zIndex: 9999,
              background: "#e7e7e7",
              border: "1px solid #ccc",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              borderRadius: "8px",
              padding: "12px",
            });

            wrapper.classList.add("custom-wrapper");
            document.body.appendChild(wrapper);

            // 👇 Add a one-time click listener to detect outside clicks
            const handleOutsideClick = (event) => {
              if (!wrapper.contains(event.target) && !info.el.contains(event.target)) {
                wrapper.remove();
                document.removeEventListener("mousedown", handleOutsideClick);
              }
            };

            // Delay a bit to prevent immediate closing on same click
            setTimeout(() => {
              document.addEventListener("mousedown", handleOutsideClick);
            }, 0);
          });




        }



      });


      calendarApi.current.render();
      const observer = new ResizeObserver(() => {
        if (!calendarApi.current) return;

        const newCols = getMaxColumnsFromContainer();
        const currentView = calendarApi.current.view.type;

        if (currentView === 'multiMonthYear') {
          calendarApi.current.setOption('multiMonthMaxColumns', newCols);
          setTimeout(() => {
            calendarApi.current.changeView('multiMonthYear');
          }, 10);
        }
      });

      observer.observe(container);

      const resizeObserver = new ResizeObserver(() => {
        updateCalendarHeader(calendarApi.current);
      });
      resizeObserver.observe(calendarEle);


    }
  }, []);



  useEffect(() => {
    const container = document.querySelector('.experience-container');
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;

        // Select all day grid events
        const dayEvents = document.querySelectorAll('.fc-daygrid-day-events');
        const moreBtn = document.querySelectorAll('.fc-more-link');



        dayEvents.forEach(el => {
          if (width < 470) {
            el.style.display = 'flex';
            el.style.gap = '';
            el.style.flexDirection = 'row';
            el.style.flexWrap = 'wrap'

          } else {
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
          }
        });
        moreBtn.forEach(el => {
          el.style.display = 'block';
          el.style.marginTop = '10px';
        })





        // Refresh calendar layout if needed
        calendarApi.current.updateSize();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);



  useEffect(() => {
    const container = document.querySelector('.experience-container');
    const calendarElement = document.getElementById('calendar');
    const calendar = calendarApi.current;

    if (!container || !calendarElement || !calendar) return;

    const updateFontSize = () => {
      const width = calendarElement.offsetWidth;
      const height = calendarElement.offsetHeight;

      // Example: scale font size based on width, clamp between 12px and 24px
      const newFontSize = Math.max(8, Math.min(14, width / 30));
      calendarElement.style.fontSize = `${newFontSize}px`;
    };

    const observer = new ResizeObserver(() => {
      calendar.updateSize();
      updateFontSize();
    });

    observer.observe(container);

    window.addEventListener('resize', updateFontSize);

    // Initial size update
    updateFontSize();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFontSize);
    };
  }, []);


  return (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/ical.js/1.4.0/ical.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@fullcalendar/icalendar@6.1.17/index.global.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.18/index.global.min.js"></script>
      <script src='fullcalendar-scheduler/dist/index.global.js'></script>
      <style>{tags["calendar.css"]}</style>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
      <div class="experience-container" style={{ backgroundColor: 'white', padding: '10px', position: 'relative', minHeight: '100%', height: 'min-content' }}>
        <div style={{ position: 'absolute', display: 'inline-block', right: '10px', top: '10px' }} ref={dropdownRef} onClick={handleToggleSetting}>
          <div style={{ padding: '4px 6px', border: '1px solid #d3d3d3', borderRadius: '5px' }}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translateY(2px)' }}>
              <path d="M8.06706 13.0501L11.7072 10.9484C12.0958 10.7241 12.2897 10.6119 12.431 10.4549C12.5561 10.3161 12.6506 10.1525 12.7083 9.9748C12.7734 9.77443 12.7734 9.55051 12.7734 9.10391V4.89447C12.7734 4.44787 12.7734 4.22397 12.7083 4.0236C12.6506 3.8459 12.5561 3.6822 12.431 3.54335C12.2903 3.38709 12.0969 3.27538 11.7116 3.05297L8.06641 0.948407C7.67782 0.724055 7.48391 0.612106 7.27734 0.568199C7.09458 0.52935 6.90562 0.52935 6.72285 0.568199C6.51629 0.612106 6.32173 0.724054 5.93314 0.948407L2.29229 3.05045C1.90415 3.27454 1.71023 3.3865 1.56901 3.54335C1.44398 3.6822 1.34956 3.8459 1.29182 4.0236C1.22656 4.22445 1.22656 4.44892 1.22656 4.89763V9.10093C1.22656 9.54964 1.22656 9.77396 1.29182 9.9748C1.34956 10.1525 1.44398 10.3161 1.56901 10.4549C1.71032 10.6119 1.90438 10.7241 2.29297 10.9484L5.93314 13.0501C6.32172 13.2744 6.51629 13.3864 6.72285 13.4303C6.90562 13.4692 7.09458 13.4692 7.27734 13.4303C7.48391 13.3864 7.67847 13.2744 8.06706 13.0501Z" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 6.99919C5 8.10376 5.89543 8.99919 7 8.99919C8.10457 8.99919 9 8.10376 9 6.99919C9 5.89462 8.10457 4.99919 7 4.99919C5.89543 4.99919 5 5.89462 5 6.99919Z" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          {openSetting && <Setting setOpenSetting={setOpenSetting} dropdownRef={dropdownRef} setOpenCalendar={setOpenCalendar} setOpenMap={setOpenMap} setMapViewSelected={setMapViewSelected} setHasTitle={setHasTitle} hasTitle={hasTitle} calendarApi={calendarApi} setShowSchedules={setShowSchedules} showSchedules={showSchedules} showHolidays={showHolidays} setShowHolidays={setShowHolidays} />}
        </div>
        {hasTitle && <CalendarTitle setScheduleTitle={setScheduleTitle} isSchedule={isSchedule} scheduleTitle={scheduleTitle} />}


        {isSchedule && <GoToCalendar calendarApi={calendarApi} setCalendarView={setCalendarView} />}

        <div style={{ display: openCalendar ? 'block' : 'none', marginTop: hasTitle ? '' : '40px' }}>
          <div class="calendar-wrapper">
            {<div id="calendar" ref={calendarRef} style={{
              width: '100%',
              maxWidth: '100%',
              margin: '20px auto',
              borderTop: 'none',
            }}></div>}
          </div>
          {isSchedule && <ResourceTitle scheduleDescription={scheduleDescription} />}
          {isModalOpen && <ResourceHeaderModal setIsResourceGroupHiding={setIsResourceGroupHiding} calendarApi={calendarApi} isModalOpen={isModalOpen} resourcesRef={resourcesRef} setIsModalOpen={setIsModalOpen} resourcesByDate={resourcesByDate} setResourcesByDate={setResourcesByDate} allGroups={allGroups} setAllGroups={setAllGroups} />}
          <GroupSettingsModal
            open={groupModalOpen}
            groupValue={currentGroupValue}
            groupRooms={calendarApi.current?.getResources().filter(r => r.extendedProps.group === currentGroupValue) || []}
            onRemoveRoom={(roomId) => {
              const calendar = calendarApi.current;
              if (!calendar) return;
              const resource = calendar.getResourceById(roomId);
              if (resource) {
                resource.remove();
              }
              setResourcesByDate(prev => {
                const updated = {};
                Object.keys(prev).forEach(dateKey => {
                  updated[dateKey] = prev[dateKey].filter(resource => resource.id !== roomId);
                });
                return updated;
              });
            }}

            onClose={() => setGroupModalOpen(false)}
            onDeleteGroup={(groupToDelete) => {
              const calendar = calendarApi.current;
              if (!calendar) return;

              calendar.getResources().forEach(resource => {
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
                group: newRoom.group
              });
              const resKey = new Date(resourceStartDate).toLocaleDateString("en-CA");
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
              calendar.getResources().forEach(resource => {
                if (resource.extendedProps.group === oldGroup) {
                  resource.setExtendedProp("group", newGroup);
                }
              });

              // 2) Update in resourcesByDate state
              setResourcesByDate(prev => {
                const updated = {};

                Object.keys(prev).forEach(dateKey => {
                  updated[dateKey] = prev[dateKey].map(resource => {
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
          {isEventModalOpen && <ResourceEventModal calendarApi={calendarApi} currentResourceId={currentResourceId} setCurrentResourceId={setCurrentResourceId} allEvents={allEvents} setAllEvents={setAllEvents} isEventModalOpen={isEventModalOpen} setIsEventModalOpen={setIsEventModalOpen} resourceDatee={resourceDate} resourceTime={resourceTime} resourceETime={resourceETime} modalPosition={modalPosition} showSchedules={showSchedules} />}

          <div class="calendar-addups">
            <div className="calendar-addups-selection">
              {types.map(type => (
                <button
                  key={type}
                  style={getButtonStyle(type)}
                  className={`calendar-addups-selection-button ${type.charAt(0)}-btn`}
                  onClick={() => handleSelectionClicking(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <div class='event-and-map' >
              <span class="event-and-map_heading">Events for {calendarTitle}</span>
              <div class='event-and-map_selector'>
                <span class='event-and-map_selector_item' style={{ backgroundColor: eventViewSelected ? '#D364334D' : '', fontWeight: eventViewSelected ? '700' : '400' }} onClick={() => onEventsClick()}>Events</span>
                <span class='event-and-map_selector_item' style={{ backgroundColor: mapViewSelected ? '#D364334D' : '', fontWeight: mapViewSelected ? '700' : '400' }} onClick={() => onMapCick()}>Bible Map</span>

              </div>
              {eventViewSelected && <EventView visibleEvents={visibleEvents} calendarApi={calendarApi} visibleCount={visibleCount} setVisibleCount={setVisibleCount} setEventInView={setEventInView} eventInView={eventInView} />
              }
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
              setResourcesByDate(prev => {
                const updated = {};
                console.log(resourceGroupNameRef.current, 'asasa')




                Object.keys(prev).forEach(date => {
                  updated[date] = prev[date].filter(resource => resource.group !== resourceGroupNameRef.current);
                });

                return updated;
              });
              console.log(resourceStartDate, 'resourcedate');


              function ymdLocal(dLike) {
                const d = dLike instanceof Date ? dLike : new Date(dLike);
                if (Number.isNaN(d.getTime())) return '';        // guard against bad input
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
              }


              const targetYmd =
                typeof resourceStartDate === 'string'
                  ? (resourceStartDate.length > 10 ? ymdLocal(resourceStartDate) : resourceStartDate) // already YYYY-MM-DD
                  : ymdLocal(resourceStartDate);


              calendarApi.current.getEvents().forEach((ev) => {
                if (!ev.start) return;
                const evYmd = ymdLocal(ev.start);
                if (evYmd === targetYmd) ev.remove();
              });


              setAllEvents((prev) =>
                prev.filter((e) => ymdLocal(e.start || e.startStr) !== targetYmd)
              );
              calendar.getResources().forEach(resource => {
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
        {mapViewSelected && openMap && MapPanel && <MapPanel />}
        {modalOpen ? <CustomModal setModalOpen={setModalOpen} addReadingPlans={addReadingPlans} calendarApi={calendarApi} /> : ''}
        {editEventOpen && <EditEvent editingEvent={editingEvent} editEventOpen={editEventOpen} setEditEventOpen={setEditEventOpen} calendarApi={calendarApi} setEventInView={setEventInView} />}

      </div >
    </>
  );
};

return App
