const { createContext, useContext, useRef, useState, useEffect } = os.appHooks;
import { useBibleContext } from 'app.hooks.bibleVariables';
const CustomModal = await thisBot.CustomModal();
const EditEvent = await thisBot.EditEvent();
const Menu = await thisBot.Menu();
const GroupSettingsModal = await thisBot.ResourceGroupSettingModal();
const ResourceEventModal=await thisBot.ResourceEventModal();


import { useCalendar } from 'ext_calendar.calendar.CalendarContext';
function getDayDifference(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Set time to midnight to avoid time zone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end - start; // in milliseconds
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
const updateTodayButtonLabel = () => {
  const container = document.querySelector('.experience-container');
  const todayBtn = document.querySelector('.fc-today-button');

  if (!container || !todayBtn) return;

  const width = container.offsetWidth;
  const label = width < 550 ? 'T' : 'Today';

  // Set label only if it’s different
  if (todayBtn.textContent !== label) {
    todayBtn.textContent = label;
  }
};
function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function getDayHeaderFormat(width, viewType) {
  // Always long for dayGrid views
  if (viewType.startsWith('timeGridDay')) {
    return { weekday: 'long' };
  }
  if (viewType.startsWith('multiMonthYear')) {
    return { weekday: 'narrow' }
  }

  // Dynamic for other views
  if (width < 400) {
    return { weekday: 'narrow' };     // S, M, T
  } else if (width < 700) {
    return { weekday: 'short' };      // Sun, Mon, Tue
  } else {
    return { weekday: 'long' };       // Sunday, Monday
  }
}


function updateCalendarHeader(calendar) {
  const width = calendar.el.offsetWidth;
  const viewType = calendar.view.type;
  const format = getDayHeaderFormat(width, viewType);
  calendar.setOption('dayHeaderFormat', format);
}

function getHumanDuration(startTime, endTime, locale = 'en') {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  const start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end < start) end += 24 * 60; // handle overnight

  const diffMins = end - start;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  const fmt = (value, unit) => new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'long'
  }).format(value);

  if (hours && mins) {
    // e.g. "4 hours 30 minutes"
    return `${fmt(hours, 'hour')} ${fmt(mins, 'minute')}`;
  }
  if (hours) {
    return fmt(hours, 'hour');
  }
  return fmt(mins, 'minute');
}




function convertTo12Hour(time24) {
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12; // Convert '0' to '12'
  return `${hour}:${minute} ${ampm}`;
}





if (!globalThis.C_E) globalThis.C_E = [];

const MapPanel = await MapsManager?.GetMapPanel?.();


const App = () => {





  const [readings, setReadings] = useState([]);



  const [customDays, setCustomDays] = useState([]);
  const [slect, setSelection] = useState('event');
  const [, setTick] = useState(0);
  const [plansOn, setPlansOn] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [playListMode, setPlaylistMode] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [editingEvent, setEditingEvent] = useState();
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [isMultiMonth, setIsMultiMonthView] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [visibleCount, setVisibleCount] = useState(3);
  const [calendarView, setCalendarView] = useState('dayGridMonth');



  const [eventTitle, setEventTitle] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');

  const [eventEndDate, setEventEndDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCreated, setEventCreated] = useState(false);
  const [eventLink, setEventLink] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedOption, setSelectedOption] = useState('No Repeat');
  const [openSetting, setOpenSetting] = useState(false);
  const [openMap, setOpenMap] = useState(true);
  const [openCalendar, setOpenCalendar] = useState(true);
  const [isSelected, setIsSelected] = useState('events');
  const [isSelected_2, setIsSelected_2] = useState('events');
  const [todayDate, setTodayDate] = useState('');
  const [eventInView, setEventInView] = useState([]);
  const [eventViewSelected, setEventViewSelected] = useState(true);
  const [mapViewSelected, setMapViewSelected] = useState(false);
  const [menuOpenForId, setMenuOpenForId] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [hasTitle, setHasTitle] = useState(true);
  const [allEvents, setAllEvents] = useState([]);
  





  const [selectedTypes, setSelectedTypes] = useState(['events']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [platform, setPlatform] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [roomTitles, setRoomTitles] = useState([]);
  const [isModalOpen_2, setIsModalOpen_2] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentResourceId, setCurrentResourceId] = useState('');
  const [openMenu, setMenuOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupMenu, setGroupMenu] = useState({ groupValue: null, position: null });
  const [currentGroupValue, setCurrentGroupValue] = useState('');

   


  const playlistsRef = useRef();
  const searchRef = useRef();
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);
  const contentRef = useRef(null);
 







  const [label, setLabel] = useState(() => {
    return localStorage.getItem('label') || 'Initial Title';
  });
  const calendarRef = useRef(null);
  const calendarApi = useRef(null);



  const types = ["events", "reading", "content", "projects", "sources"];


  const { name, apiCalendar, setApiCalendar } = useCalendar();



  useEffect(() => {
    setApiCalendar(calendarApi.current);
  });




  useEffect(() => {

    localStorage.setItem('label', label);
  }, [label]);
  useEffect(() => {
    setEventCreated(false);


  });


  const onClickMenuButton = () => {
    setIsMenuOpen(prev => !prev);
  }





  function formatToYYYYMMDD(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
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
  useEffect(() => {
    // Load styles
    const styles = [
      "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/main.min.css",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/main.min.css",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/main.min.css",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/resource-timegrid@6.1.17/main.min.css"
    ];

    styles.forEach(href => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });

    // Load scripts sequentially
    const scripts = [
      "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/resource-timegrid@6.1.17/index.global.min.js" // this is enough
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

      // Add CSS if not already added
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
    setReadings([...globalThis.C_E])
  }, []);


  function parseDashedDateToValidDate(dateStr) {
    const parts = dateStr.split('-').map(p => p.trim());
    if (parts.length !== 3) return null;

    const [month, day, year] = parts;
    const formatted = `${month} ${day}, ${year}`;

    const date = new Date(formatted);
    return isNaN(date.getTime()) ? null : date;
  }

  const handleToggle = () => setOpenSetting(prev => !prev);

  const handleOptionClick = (option) => {
    console.log('Selected:', option);
    if (option === 'calendar') {
      // Open calendar logic
    } else if (option === 'map') {
      // Open map logic
    } else if (option === 'both') {
      // Open both
    }
    setOpenSetting(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenSetting(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleOpenCalendar = () => {
    setOpenCalendar(true);
    setOpenMap(false);
    setOpenSetting(false)
  }
  const handleOpenMap = () => {
    setOpenCalendar(false);
    setOpenMap(true);
    setMapViewSelected(true)
    setOpenSetting(false);
  }
  const handleOpenBoth = () => {
    setOpenCalendar(true);
    setOpenMap(true);
    setOpenSetting(false);

  }
  const handleTitle = () => {
    setHasTitle(prev => !prev)

  }


  const handleSelectionClicking = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

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
  const handleDelete_2 = (id) => {
    setEventInView(prev => prev.filter((e) => e.id !== id))

    const evt = calendarApi.current.getEventById(id);
    if (evt) evt.remove();
  }
  const openEventModalForGroup = (groupValue) => {
    setCurrentGroupValue(groupValue);
    setGroupModalOpen(true);
  };





  const addReadingPlans = (selected) => {
    const playLists = selected.reduce((acc, item) => acc.concat({ list: item.list, playList: item.name }), []);

    let start = new Date();

    if (playLists[0]?.list[0]?.type !== 'date') {
      console.log('chaged')

    }

    const newEvents = [];
    console.log(playLists);

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
              color: 'green',
              extendedProps: { startTime: '', endTime: '', isReapeating: false, type: "reading" },


              allDay: true,
              source: 'reading',
              readingPlans: list,
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

    }
  };
  console.log(readings);






  useEffect(() => {
    globalThis['defaultplaylists']


    globalThis['readings'] = readings;
    return () => {
      globalThis['AddReadingPlans'] = null;
      globalThis['readings'] = null;
    };
  });
  


  const today = new Date();


  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(today.getDate()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day}`;

  const container = document.querySelector('.experience-container');
  const parent = container?.parentElement;


  function addOneHour(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);

    // Create a Date for today at that time
    const date = new Date();
    date.setHours(h, m, 0, 0);

    // Add 1 hour
    date.setHours(date.getHours() + 1);

    // Format back to "HH:mm"
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }


  let playListsFiltered = [];
  function showEventPopup(info, onSubmit) {
    let plays = globalThis['defaultplaylists'];

    if (plays.length === 0) {
      plays = [{
        checklistEnabled: false, color: "#D9D9D9", dateFormat: "MM-DD-YYYY", description: "", icon: "subscriptions", id: "aa9be68e-33f8-4f55-8452-a56447b5c347"
        , isCustomColor: false, isCustomIcon: false, isLayers: false, list:
          [{ type: 'verse', content: 'Genesis 1:1', additionalInfo: {}, id: 'ab7ba93b-15a0-4144-a51c-4c9840a5c2e1' }, { type: 'verse', content: 'Genesis 1:4', additionalInfo: {}, id: 'ca6b309e-9a44-45b0-9dac-19ed9113c7ad' }, { type: 'verse', content: 'Genesis 1:6', additionalInfo: {}, id: '305aafbc-cf29-446f-91a5-12cb8cacc752' }]
        ,
        name: "Craigs",
        nesting
          :
          1,
        readingPlanEnabled
          :
          true,
        selectedTags
          :
          []
      }]
    }
    playListsFiltered = plays.filter(item => item.readingPlanEnabled);
    console.log(playListsFiltered, 'filtered');
    const popup = document.createElement('div');
    const dayNumber = info.date.getDay();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[dayNumber];
    const date = (info.date);
    const dateStr = formatToYYYYMMDD(info.date);
    console.log(dateStr)
    const d = new Date(date);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const endH = String(d.getHours() + 1).padStart(2, '0');
    console.log(`${h}:${m}`);
    const time = `${h}:${m}`;
    const endTime = `${endH}:${m}`;
    console.log(endTime);
    let val;
    let endVal;
    if (time === '00:00') {
      val = '';
      endVal = '';

    }
    else {
      endVal = endTime;

      val = time;

    }

    const checked = {};
    console.log(info, 'info');

    popup.addEventListener('mousedown', (e) => e.stopPropagation());

    popup.innerHTML = `
    <div class="google-modal">
      <input type="text" id="popup-title" placeholder="Add title" class="gm-input title" />
      <div class="gm-modal-select">
        <span class="gm-modal-select-1">Event</span>
        <span class="gm-modal-select-2">Reading plans</span>
      </div>
      <div class="gm-modal-event"></div>
      <div class="gm-actions">
        <button id="popup-add-btn" class="gm-button">Save</button>
        <button id="popup-cancel-btn" class="gm-button cancel">Cancel</button>
      </div>
    </div>
  `;

    const modalEvent = popup.querySelector('.gm-modal-event');
    const eventTab = popup.querySelector('.gm-modal-select-1');
    const plansTab = popup.querySelector('.gm-modal-select-2');

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'custom-modal-overlay';
    modalOverlay.innerHTML = `
    <div class="custom-modal">
      <h1>Custom recurrence</h1>
      <div class='custom-modal-repeat'>
        <h4>Repeat on</h4>
        <div class="custom-modal-repeat-week">
          <label><input type="checkbox" value="1" /> M</label>
          <label><input type="checkbox" value="2" /> T</label>
          <label><input type="checkbox" value="3" /> W</label>
          <label><input type="checkbox" value="4" /> T</label>
          <label><input type="checkbox" value="5" /> F</label>
          <label><input type="checkbox" value="6" /> S</label>
          <label><input type="checkbox" value="7" /> S</label>
        </div>
      </div>
      <div class="custom-modal-date">
        <div class='custom-modal-date-start'>
          <label class="label">Start date</label>
          <input id="start-date" value="${dateStr}" type='date'/>
        </div>
        <div class='custom-modal-date-end'>
          <label class="label">End date</label>
          <input id="end-date" value="${dateStr}" type='date'/>
        </div>
      </div>
      <div class="custom-modal-actions" style="margin-top: 12px; text-align: right;">
        <button id="custom-modal-save">Save</button>
        <button id="custom-modal-cancel">Cancel</button>
      </div>
    </div>
  `;
    document.body.appendChild(modalOverlay);

    const customModal = modalOverlay.querySelector('.custom-modal');

    modalOverlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    modalOverlay.addEventListener('mousedown', (e) => e.stopPropagation());
    customModal.addEventListener('mousedown', e => e.stopPropagation());
    customModal.addEventListener('click', e => e.stopPropagation());


    modalOverlay.querySelector('#custom-modal-cancel').addEventListener('click', () => {
      modalOverlay.classList.remove('custom-modal-overlay-show');
      customModal.classList.remove('custom-modal-show');
    });

    modalOverlay.querySelector('#custom-modal-save').addEventListener('click', () => {
      const selected = Array.from(modalOverlay.querySelectorAll('input[type=checkbox]:checked'))
        .map(cb => Number(cb.value));

      setCustomDays(prev => [...prev, ...selected]); // This assumes setCustomDays is available in your scope
      modalOverlay.classList.remove('custom-modal-overlay-show');
      customModal.classList.remove('custom-modal-show');
    });
    document.querySelectorAll('input[type="date"]').forEach(input => {
      input.addEventListener('click', () => {
        input.showPicker?.(); // Only works in Chromium-based browsers
      });
    });

    function renderEventFields() {
      modalEvent.innerHTML = `
      <div class='gm-event'>
       
       <div class="gm-input-date">
      <svg
          style={{ color: 'gray' }}
          width="24"
          height="24"
          fill="none"
          stroke="gray"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      <div class="gm-input-date-input">
           <input id="start-date" class='gm-input-date-input' value="${dateStr}" type="date" />
           <span class="gm-input-date-span">to</span>
           <input id="end-date" class='gm-input-date-input' value="${dateStr}"1a13sq3 type="date" />
       </div>
    </div>
   <div style="display: flex; align-items: center; gap: 16px;">
        <svg
            style="color: gray; flex-shrink: 0;"
            width="24"
            height="24"
            fill="none"
            stroke="gray"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>

  <div style="display: flex; align-items: center; gap: 6px;">
    <input
      class="gm-input-start_time"
      value="${val}"
      
      type="time"
      name="startTime"
      style="padding: 4px 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;"
    />
    <span style="color: gray;">to</span>
    <input
    value="${endVal}"
    class='gm-input-end_time'
      type="time"
      name="endTime"
      style="padding: 4px 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;"
    />


  </div>
</div>

      <div class="gm-input-svg">
        <label for="repeatSelect">
          <svg style="color:gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" class="feather feather-repeat">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </label>
        <select id="repeatSelect">
          <option value="No Repeat">No Repeat</option>
          <option id="repeatDayOption">Repeat on ${dayName}</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div class="gm-input-svg">
        <svg style="color: gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" class="feather feather-file-text">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        <textarea class="gm-input-description" id="popup-description" placeholder="Add Description" class="gm-input" rows="2"></textarea>
      </div>

      <div class="gm-input-svg">
        <svg style="color:gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" class="feather feather-link">
          <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
          <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
        </svg>
        <input type="text" class='gm-input-link' id="popup-link" placeholder="Link" class="gm-input" />
      </div>
     



      
      </div>
    `;



      popup.querySelector('#repeatSelect')?.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customModal?.classList.add('custom-modal-show');
          modalOverlay?.classList.add('custom-modal-overlay-show');
        }
      });


    }







    function renderReadingPlans() {


      modalEvent.innerHTML = '';
      const title = document.createElement('h2');
      title.textContent = 'Available Playlists';
      title.style.marginBottom = '16px';
      title.style.marginLeft = '30px';
      title.style.fontSize = '1.25rem';
      title.style.fontWeight = 'bold';
      title.style.color = 'black';

      const list = document.createElement('ul');
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.marginLeft = '30px';
      list.style.maxHeight = '300px';
      list.style.overflowY = 'auto';

      playListsFiltered.forEach((play) => {
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.style.color = 'black';

        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '3px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!checked[play.id];
        checkbox.onclick = () => {
          checked[play.id] = !checked[play.id];
        };

        const label = document.createElement('div');
        label.textContent = play.name;
        label.style.border = '1px solid #ddd';
        label.style.padding = '5px 10px';
        label.style.cursor = 'pointer';
        label.style.borderRadius = '6px';
        label.style.backgroundColor = '#f9f9f9';

        label.onmouseenter = () => label.style.backgroundColor = '#eee';
        label.onmouseleave = () => label.style.backgroundColor = '#f9f9f9';

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        li.appendChild(wrapper);
        list.appendChild(li);
      });

      modalEvent.appendChild(title);
      modalEvent.appendChild(list);
    }

    // Initial render
    eventTab.classList.add('gm-modal-select-item-selected');
    renderEventFields();

    eventTab.onclick = () => {
      setPlaylistMode(prev => !prev);
      eventTab.classList.add('gm-modal-select-item-selected');
      plansTab.classList.remove('gm-modal-select-item-selected');
      renderEventFields();
    };

    plansTab.onclick = () => {
      setPlaylistMode(prev => !prev);
      plansTab.classList.add('gm-modal-select-item-selected');
      eventTab.classList.remove('gm-modal-select-item-selected');
      renderReadingPlans();

    };


    const instance = tippy(document.body, {
      getReferenceClientRect: () => info.dayEl.getBoundingClientRect(),
      content: popup,
      interactive: true,
      allowHTML: true,
      trigger: 'manual',
      placement: 'auto',
      hideOnClick: false,
      theme: 'custom-light',
      appendTo: document.body,
    });

    instance.show();
    function addOneHour(startTime) {
      const [hr, mn] = startTime.split(':').map(Number);

      // Create a Date for today at that time
      const date = new Date();
      date.setHours(hr, mn, 0, 0);

      // Add 1 hour
      date.setHours(date.getHours() + 1);

      // Format back to "HH:mm"
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const startInput = modalEvent.querySelector('.gm-input-start_time');
    const endInput = modalEvent.querySelector('.gm-input-end_time');
    startInput.value = val;        // e.g. "02:11"
    endInput.value = addOneHour(val);

    // Update end time whenever the user changes start time
    startInput.addEventListener('change', () => {
      if (startInput.value) {
        endInput.value = addOneHour(startInput.value);
      }
    });





    // Autofocus title
    setTimeout(() => {
      popup.querySelector('#popup-title')?.focus();
    }, 0);


    function handleClickOutside(e) {
      const isClickInsidePopup = popup.contains(e.target);
      const isClickInsideCustomModal = modalOverlay.contains(e.target);
      if (!isClickInsidePopup && !isClickInsideCustomModal) {
        instance.hide();
        modalOverlay.remove();
        document.removeEventListener('mousedown', handleClickOutside);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    // Cancel button
    popup.querySelector('#popup-cancel-btn')?.addEventListener('click', () => {
      instance.destroy();
      instance.hide();
      modalOverlay.remove();
    });

    // Save button
    popup.querySelector('#popup-add-btn')?.addEventListener('click', (e) => {
      e.preventDefault();

      const title = popup.querySelector('#popup-title')?.value || 'Untitled';
      const description = popup.querySelector('#popup-description')?.value || '';
      const link = popup.querySelector('#popup-link')?.value || '';
      const start = popup.querySelector('#start-date')?.value || date;
      const end = popup.querySelector('#end-date')?.value || date;
      const startTime = popup.querySelector('.gm-input-start_time')?.value;
      const endTime = popup.querySelector('.gm-input-end_time')?.value;



      const recurVal = popup.querySelector('#repeatSelect')?.value || 'No Repeat';
      const isPlansTabActive = plansTab.classList.contains('gm-modal-select-item-selected');
      console.log(isPlansTabActive, 'sass');

      if (isPlansTabActive) {
        const selected = playListsFiltered.filter(p => checked[p.id]);
        console.log('asasasas', selected);

        addReadingPlans(selected); // Optional: handle separately or pass via onSubmit
      }

      onSubmit({ title, description, link, start, end, startTime, endTime, recurVal, isPlansTabActive });
      instance.hide();
      modalOverlay.remove();
    });
  }


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

  useEffect(() => {
    readings.forEach(evt => {
      // Check for existing event with same ID
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
  const handleEditing = (event) => {

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
  console.log(eventInView, 'eventin');

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
    console.log(calendarView, 'sasasa')
    if (calendarView !== 'resourceTimelineDay') {
      const eventsToadd = filteredEvents.filter((event) => !event.resourceId);
      console.log(eventsToadd, 'qsqasqsqw')
      calendarApi.current.removeAllEvents();
      calendarApi.current.addEventSource(eventsToadd);
    }
    else {
      const eventsToadd = filteredEvents.filter((event) => event.resourceId);
      console.log(eventsToadd, 'qsqasqsqwsasa')
      calendarApi.current.removeAllEvents();
      calendarApi.current.addEventSource(eventsToadd);

    }


  };


  useEffect(() => {
    applyFilterByReinit();
  }, [selectedTypes, calendarView]);


  const handleCalendarRender = () => {
    if (!calendarApi.current && calendarRef.current) {
      calendarApi.current = calendarRef.current.getApi();
    }
  };

  const addNewResource = () => {
    if (!calendarApi.current) return;

    // Create resources with a group label (platform)
    const newResources = roomTitles.map((room, index) => ({
      id: `room-${Date.now()}-${index}`,
      title: room,
      group: platform, // 👈 group field
    }));

    // Add all rooms to calendar
    newResources.forEach(resource => calendarApi.current.addResource(resource));

    // Reset state
    setPlatform('');
    setRoomInput('');
    setRoomTitles([]);
    setIsModalOpen(false);
  };

  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isModalOpen &&
        modalRef.current?.style.display !== 'none' &&
        contentRef.current &&
        !contentRef.current.contains(e.target)
      ) {
        closeModal();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isModalOpen]);
  





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
        slotLabelFormat: {
          hour: 'numeric',
          omitZeroMinute: true,
          meridiem: 'short' // ensures "12:00AM" with a space
        },

        slotLabelContent: function (arg) {
          const dt = arg.date;
          const hour = (dt.getHours() % 12) || 12;
          const meridiem = dt.getHours() < 12 ? 'AM' : 'PM';
          return { html: `<span>${hour} ${meridiem}</span>` };
        },


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

        },
        slotMinTime: '00:00:00',
        slotMaxTime: '25:00:00',
        slotDuration: '00:30:00',
        scrollTime: '07:00:00',








        initialView: 'dayGridMonth',
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
        resourceLabelContent: function (arg) {
          return (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px' }}>
              <span>{arg.resource.title}</span>
              <button
                style={{
                  marginLeft: '10px',
                  padding: '0 2px',
                  fontSize: '0.5rem',
                  cursor: 'pointer'
                }}
                onClick={() => openEventModalForResource(arg.resource.id,)}
              >
                +
              </button>
            </div>
          );
        },
        resourceGroupLabelContent: function (arg) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    position: { top: rect.top + window.scrollY + 20, left: rect.left + window.scrollX },
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

        resources: [
          { id: 'desc-bible', title: 'Bible Study Description', group: 'Bible Study' },
          { id: 'desc-prayer', title: 'Prayer Group Description', group: 'Prayer Group' },
          { id: 'desc-fellowship', title: 'Fellowship Description', group: 'Fellowship' }
        ],
        resourceGroupField: 'group',
        events: [
          {
            id: '1',
            resourceId: 'desc-bible',
            title: 'Genesis Reading',
            start: '2025-07-24T09:00:00',
            end: '2025-07-24T10:00:00'
          },
          {
            id: '2',
            resourceId: 'desc-prayer',
            title: 'Prayer for Youth',
            start: '2025-07-24T10:00:00',
            end: '2025-07-24T11:00:00'
          }
        ],

        allDaySlot: true,
        allDayText: 'All day',

        expandRows: true,





        contentHeight: '400px',



        eventClassNames: function (arg) {
          const width = document.querySelector('.experience-container')?.offsetWidth || 0;

          const start = new Date(arg.event.start);
          const end = new Date(arg.event.end || arg.event.start);

          // Make sure end is NOT exclusive — FullCalendar treats end as exclusive for all-day events
          const isMultiDay = start.toDateString() !== new Date(end.getTime() - 1).toDateString();

          if (isMultiDay && width <= 500) {
            return ['event-line'];
          } else if (!isMultiDay) {
            return width > 500 ? ['full-view'] : ['dot-view'];
          } else {
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





          if (info.jsEvent?.target.closest('.tippy-box')) return;





          const date = info.date;
          const jsDay = date.getDay();
          const customDay = jsDay === 0 ? 7 : jsDay;
          const formattedDate = date.toISOString().split('T')[0]; // "YYYY-MM-DD"


          if (!calendarApi) {

            return;
          }


          if (info.view.type !== 'multiMonthYear' && info.view.type !== 'resourceTimelineDay') {
            console.log('no-multimonth');

            showEventPopup(info, ({ title, description, link, start, end, startTime, endTime, recurVal, isPlansTabActive }) => {

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
                    color: 'blue',
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
                    color: 'blue',


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
                    color: 'blue',

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
                      color: 'blue',
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
                    console.log(eventInView, 'dadadad')

                    calendarApi.current.addEvent(newEvent);
                  }



                }

              }







            });
          }
          else {
            if (info.view.type !== 'resourceTimelineDay') {

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

          updateCalendarHeader(calendarApi.current);
          console.log(info)
          const { start, end } = info;
          setCalendarTitle(info.view.title);
          setCalendarView(calendarApi.current.view.type)
          const events = onRangeChange(start, end);
          const sortedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
          setEventInView(sortedEvents);






          const styleButtons = () => {
            const prevBtn = calendarRef.current.querySelector('.fc-prev-button');
            const nextBtn = calendarRef.current.querySelector('.fc-next-button');
            const todayBtn = calendarRef.current.querySelector('.fc-today-button');

            if (prevBtn) {
              Object.assign(prevBtn.style, {
                backgroundColor: 'white',
                color: 'black',
                fontSize: '10px',
                padding: "0",
                border: 'none',
                marginRight: '10px',
                cursor: 'pointer',
                alignSelf: 'center'
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
                cursor: 'pointer',
              });
              nextBtn.onfocus = nextBtn.onmousedown = () => {
                nextBtn.style.outline = 'none';
                nextBtn.style.boxShadow = 'none';
              };
            }

            if (todayBtn) {
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
          };



          // Sty center title (or)
          function onToolbarDateClick(e) {
            const titleEl = e.target.closest('.fc-toolbar-title');
            if (!titleEl) return;
            if (titleEl) {
              Object.assign(titleEl.style, {
                color: '#303133',
                fontSize: 'medium',
                fontWeight: '400',
                transform: 'translateY(3px)',
                display: 'inline-block',
              });
            }

            const parsed = new Date(titleEl.textContent);
            const iso = isNaN(parsed) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);

            const input = document.createElement('input');
            input.type = 'date';
            input.value = iso;
            input.style.minWidth = `${titleEl.offsetWidth}px`;
            input.style.fontSize = window.getComputedStyle(titleEl).fontSize;
            input.style.padding = `2px`;

            titleEl.replaceWith(input);
            input.focus();

            const finish = () => {
              if (input.value) calendarApi.current.gotoDate(input.value);
              input.replaceWith(titleEl);
            };

            input.addEventListener('blur', finish);
            input.addEventListener('keydown', ke => ke.key === 'Enter' && input.blur());
          }

          const toolbar = calendarRef.current.querySelector('.fc-toolbar');

          if (toolbar) {
            toolbar.removeEventListener('click', onToolbarDateClick);
            toolbar.addEventListener('click', onToolbarDateClick);
          }


          // Right side toolbar
          const rightHeaderEl = calendarRef.current.querySelector('.fc-header-toolbar .fc-toolbar-chunk:last-child');
          if (rightHeaderEl) {
            Object.assign(rightHeaderEl.style, {
              display: 'flex',
              alignItems: 'center',

              flexWrap: 'nowrap',
              gap: '10px',
              justifyContent: 'flex-end',
            });

            // View toggle select
            if (!document.getElementById('view-toggle-select')) {
              const select = document.createElement('select');
              select.id = 'view-toggle-select';
              select.innerHTML = `
              <option value="timeGridDay">Day</option>     
            <option value="timeGridWeek">Weekly</option>
            <option value="dayGridMonth">Monthly</option>
            <option value="multiMonthYear">Year</option>
            <option value="resourceTimelineDay" >Resource</option>

      `;



              Object.assign(select.style, {
                marginLeft: '10px',
                padding: '4px 6px 2px 4px',
                fontSize: '14px',
                fontFamily: 'Satoshi',
                color: '#606266',
                border: '1px solid #d3d3d3',
                borderRadius: '0',
                transform: 'translateY(3px)',
                cursor: 'pointer'
              });
              const currentView = calendarApi.current?.view?.type || 'dayGridMonth';


              select.value = currentView;
              select.addEventListener('change', (e) => {
                const selectedView = e.target.value;
                calendarApi.current.changeView(selectedView);

                // Optional: trigger isMultiMonth update

              });
              rightHeaderEl.appendChild(select);
            }

            // Add Event Button
            if (!document.getElementById('add-event-button')) {
              const addButton = document.createElement('button');
              addButton.id = 'add-event-button';
              addButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
             xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
          <path d="M9.95441 4.16602V15.8327" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.12109 10H15.738" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Add Event</span>`;
              Object.assign(addButton.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
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
                transform: 'translate(7px,3px)',
              });

              rightHeaderEl.appendChild(addButton);
            }
          }

          styleButtons();

          const applyResponsiveToCalendarWidth = () => {
            const calendarEl = calendarRef.current;
            if (!calendarEl) return;

            const width = calendarEl.offsetWidth;
            const label = width < 500 ? 'T' : 'Today';

            const todayBtn = calendarEl.querySelector('.fc-today-button');









            const viewSelect = document.getElementById('view-toggle-select');
            if (viewSelect) {
              const monthly = viewSelect.querySelector('option[value="dayGridMonth"]');
              const weekly = viewSelect.querySelector('option[value="timeGridWeek"]');
              const daily = viewSelect.querySelector('option[value="timeGridDay"]');
              const yearly = viewSelect.querySelector('option[value="multiMonthYear"]');
              const resource = viewSelect.querySelector('option[value="resourceTimelineDay"]')
              if (monthly && weekly) {
                monthly.text = width < 550 ? 'M' : 'Monthly';
                weekly.text = width < 550 ? 'W' : 'Weekly';
                yearly.text = width < 550 ? 'Y' : 'Yearly';
                daily.text = width < 550 ? 'D' : 'Daily';
                resource.text = width < 550 ? 'R' : 'Resource';

              }
            }

            const addBtn = document.getElementById('add-event-button');
            addBtn.addEventListener('click', () => {
              setModalOpen(true);
            })
            addBtn.dataset.listenerAttached = 'true';
            if (addBtn) {
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
                addBtn.appendChild(span);
              }
            }
          };

          applyResponsiveToCalendarWidth();
          const resizeObserver = new ResizeObserver(applyResponsiveToCalendarWidth);
          resizeObserver.observe(calendarRef.current);
        }

        ,










        eventDidMount: (info) => {
          console.log(info, 'asasasasa');

          const eventType = info.event.extendedProps.type;
          const el = info.el;

          // Filter logic based on current state


          const isInPopover = info.el.closest('.fc-popover');







          if (isInPopover) {
            // Inside modal: show full title
            info.el.classList.remove('dot-view');
            info.el.classList.add('full-view');
          } else {

            // In calendar view
            const width = document.querySelector('.experience-container')?.offsetWidth || 0;
            if (width < 500) {
              info.el.classList.add('dot-view');
              info.el.classList.remove('full-view');
            } else {
              info.el.classList.add('full-view');
              info.el.classList.remove('dot-view');
            }
          }
          console.log(info);

          const handleDelete = (id) => {
            setEventInView(prev => prev.filter(ev => ev.id !== id));
            const evt = calendarApi.current.getEventById(id);
            if (evt) evt.remove();
          }
          const handleEditing = (id) => {


            const evt = calendarApi.current.getEventById(id);
            setEditingEvent(evt);
            setEditEventOpen(true);

          }



          const { title, extendedProps, start, id } = info.event;
          console.log(id);
          const { description, link, readingPlans } = extendedProps;
          const formattedDate = start.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }).replace(/ /g, '-');

          // ⏰ Format time as: "02:17 AM"
          const formattedTime = start.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const wrapper = document.createElement('div');



          const options = document.createElement('div');
          const dlt = document.createElement('span');
          dlt.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 20 20" class="icon-btn">
  <path d="M6 2a1 1 0 0 0-1 1v1h10V3a1 1 0 1 0-2 0h-6a1 1 0 0 0-1-1zM5 6h10l-.603 9.04A2 2 0 0 1 12.405 17H7.595a2 2 0 0 1-1.992-1.96L5 6z"/>
</svg>
`
          dlt.style.cssText = `
            color: gray;
          `;
          dlt.addEventListener('click', () => handleDelete(id));
          const edit = document.createElement('span');
          edit.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="currentColor" class="icon-btn"  >
  <path
    d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345L15.7238 5.72328C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865C16.3351 6.57602 16.335 6.75631 16.2807 6.92368C16.2189 7.11382 16.054 7.27865 15.7245 7.60819L15.7238 7.6089L13.3332 9.99944M9.99992 6.66611L13.3332 9.99944"
    stroke="#000000"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>`;
          edit.style.cssText = `
            color: gray;
            
          `;
          edit.addEventListener('click', () => handleEditing(id))
          const close = document.createElement('span');
          close.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 20 20" class="icon-btn">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/>
                            </svg>`;
          close.style.cssText = `
            color: gray;
          `;
          options.style.cssText = `
             display:flex;
             gap:6px;
             positon:absolute;
             top:2px;
             
             transform: translate(115px,-10px);
             right:2px;
          `;

          options.appendChild(dlt);
          options.appendChild(edit);
          options.appendChild(close);





          // Event Title


          // Reading Plans (if exists)
          if (readingPlans && Array.isArray(readingPlans)) {
            const plansSection = document.createElement('div');
            plansSection.style.marginTop = '16px';

            const heading = document.createElement('div');
            heading.textContent = '📚 Reading Plans';
            heading.style.cssText = `
      font-weight: 500;
      margin-bottom: 8px;
      color: #3c4043;
    `;
            plansSection.appendChild(heading);

            const ul = document.createElement('ul');
            ul.style.cssText = 'padding-left: 0; margin: 0; list-style: none;';

            readingPlans.forEach(plan => {
              const li = document.createElement('li');
              const button = document.createElement('button');

              button.textContent = plan;
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

              button.addEventListener('click', () => {
                alert(`You clicked: ${plan}`);
              });

              li.appendChild(button);
              ul.appendChild(li);
            });

            plansSection.appendChild(ul);
            wrapper.appendChild(plansSection);
          }
          else {



            wrapper.style.position = 'relative';
            wrapper.style.padding = '12px';
            wrapper.appendChild(options);

            const container = document.createElement('div');
            container.style.cssText = `
               display:flex;
               flex-direction:column;
               gap:4px;
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
              backgroundColor: ' #87ceeb',
            });
            const titleELC = document.createElement('div');
            titleELC.style.cssText = `
              display:flex;
              flex-direction:column;
              gap:'1px';
            `



            const titleEl = document.createElement('div');
            titleEl.textContent = title || 'Untitled Event';

            Object.assign(titleEl.style, {
              fontSize: '20px',
              fontWeight: '800',
              color: '#000',
            });
            const date = document.createElement('p');
            date.innerHTML = `
  <div style="
    display: inline-block;
   
   
  ">
    <span>${formattedDate} (${formattedTime})</span>
  </div>
`;
            date.style.cssText = `
               font-size:10px;
               
              
               
               color:black;
               margin-left:4px;
              transform:translateY(-10px)
               
            `;



            titleContainer.appendChild(greenDot);
            titleELC.appendChild(titleEl);
            titleELC.appendChild(date);
            titleContainer.appendChild(titleELC);
            container.appendChild(titleContainer);
            container.appendChild(date);

            // 📝 Description section with icon
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

            // 🔗 Link section with icon
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
        </svg>`
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

            wrapper.appendChild(container);

          }





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
              close.addEventListener('click', () => {
                ins.hide();
              })
            }
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

  console.log(calendarApi.current, 'aasasa')

  useEffect(() => {
    const container = document.querySelector('.experience-container');
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;

        // Toggle dot vs. full event mode
        calendarApi.current.updateSize(); // refresh layout
        calendarApi.current.render();     // reapply eventClassNames
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  console.log(apiCalendar, 'aaaaa')



  useEffect(() => {

    if (eventCreated && calendarApi.current) {
      const eventData = {
        title: eventTitle,
        start: `${eventStartDate}T${eventStartTime}:00`, // use ISO string or JS Date
        allDay: `${eventEndDate}T${eventEndTime}:00`,
        allDay: false,
        extendedProps: {
          description: eventDescription,
          link: eventLink,
        }
      };

      if (selectedOption === 'custom') {
        eventData.daysOfWeek = selectedDays; // e.g., [1,3,5]
      }

      calendarApi.current.addEvent(eventData);
      setEventCreated(false);
    }
  }, [eventCreated, selectedOption]);

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




  const handleClick = async () => {
    const labelVal = await os.showInput("", { title: 'Type calendar name' });
    if (labelVal) {
      setLabel(labelVal)
    }
  };
  const onCloseModal = () => {
    setModalOpen(prev => !prev);

  }
  const calendarObj = calendarApi.current;
  console.log(calendarObj, 'calendarApi');
  console.log(eventInView, 'sdsdsd')

  const openEventModalForResource = (resourceId) => {
    setCurrentResourceId(resourceId);
    setIsEventModalOpen(true);
  };
  








  return (
    <>
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.18/index.global.min.js"></script>


      <script src="https://unpkg.com/@popperjs/core@2"></script>
      <script src="https://unpkg.com/tippy.js@6"></script>

      <script src='fullcalendar-scheduler/dist/index.global.js'></script>



      <style>{tags["calendar.css"]}</style>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
      <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/dist/tippy.css" />



      <div class="experience-container" style={{ backgroundColor: 'white', padding: '10px', position: 'relative', height: '100%' }}>
        <div style={{ position: 'absolute', display: 'inline-block', right: '10px', top: '10px' }} ref={dropdownRef} >

          <div style={{ padding: '4px 6px', border: '1px solid #d3d3d3', borderRadius: '5px' }}>

            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translateY(2px)' }} onclick={handleToggle}>
              <path d="M8.06706 13.0501L11.7072 10.9484C12.0958 10.7241 12.2897 10.6119 12.431 10.4549C12.5561 10.3161 12.6506 10.1525 12.7083 9.9748C12.7734 9.77443 12.7734 9.55051 12.7734 9.10391V4.89447C12.7734 4.44787 12.7734 4.22397 12.7083 4.0236C12.6506 3.8459 12.5561 3.6822 12.431 3.54335C12.2903 3.38709 12.0969 3.27538 11.7116 3.05297L8.06641 0.948407C7.67782 0.724055 7.48391 0.612106 7.27734 0.568199C7.09458 0.52935 6.90562 0.52935 6.72285 0.568199C6.51629 0.612106 6.32173 0.724054 5.93314 0.948407L2.29229 3.05045C1.90415 3.27454 1.71023 3.3865 1.56901 3.54335C1.44398 3.6822 1.34956 3.8459 1.29182 4.0236C1.22656 4.22445 1.22656 4.44892 1.22656 4.89763V9.10093C1.22656 9.54964 1.22656 9.77396 1.29182 9.9748C1.34956 10.1525 1.44398 10.3161 1.56901 10.4549C1.71032 10.6119 1.90438 10.7241 2.29297 10.9484L5.93314 13.0501C6.32172 13.2744 6.51629 13.3864 6.72285 13.4303C6.90562 13.4692 7.09458 13.4692 7.27734 13.4303C7.48391 13.3864 7.67847 13.2744 8.06706 13.0501Z" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 6.99919C5 8.10376 5.89543 8.99919 7 8.99919C8.10457 8.99919 9 8.10376 9 6.99919C9 5.89462 8.10457 4.99919 7 4.99919C5.89543 4.99919 5 5.89462 5 6.99919Z" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          {openSetting && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                alignItems: 'start',
                right: '0',
                fontSize: '15px',
                backgroundColor: 'black',
                color: 'white',
                border: '1px solid #ccc',
                borderRadius: '6px',
                boxShadow: '0px 4px 8px rgba(0,0,0,0.5)',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '15px 4px',

                width: '130px'

              }}
            >
              <div
                style={{ width: '100%', borderRadius: '6px', padding: '2px 2px' }}

                onClick={handleOpenCalendar}

                onMouseEnter={e => {
                  (e.target.style.backgroundColor = '#f0f0f0')
                  e.target.style.color = 'black';
                  e.target.style.cursor = 'pointer';
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'black';

                }}
                onMouseLeave={e => {
                  (e.target.style.backgroundColor = 'transparent')
                  e.target.style.color = 'white'
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'white';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg

                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    fill="none"
                    stroke='white'
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Open Calendar
                </span>
              </div>
              <div
                onClick={handleTitle}
                style={{ width: '100%', borderRadius: '6px', padding: '2px 2px' }}

                onMouseEnter={e => {
                  (e.target.style.backgroundColor = '#f0f0f0')
                  e.target.style.color = 'black'
                  e.target.style.cursor = 'pointer'
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'black';

                }}
                onMouseLeave={e => {
                  (e.target.style.backgroundColor = 'transparent')
                  e.target.style.color = 'white'
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'white';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
                    fill="none"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    viewBox="0 0 24 24">
                    <path d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345L15.7238 5.72328C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865C16.3351 6.57602 16.335 6.75631 16.2807 6.92368C16.2189 7.11382 16.054 7.27865 15.7245 7.60819L15.7238 7.6089L13.3332 9.99944M9.99992 6.66611L13.3332 9.99944" />
                  </svg>

                  {hasTitle ? 'Hide Title' : 'Show Title'}
                </span>
              </div>

              <div
                onClick={handleOpenMap}
                style={{ width: '100%', borderRadius: '6px', padding: '2px 2px' }}

                onMouseEnter={e => {
                  (e.target.style.backgroundColor = '#f0f0f0')
                  e.target.style.color = 'black'
                  e.target.style.cursor = 'pointer'
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'black';

                }}
                onMouseLeave={e => {
                  (e.target.style.backgroundColor = 'transparent')
                  e.target.style.color = 'white'
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'white';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <polygon points="1 6 1 22 8 19 16 22 23 18 23 2 16 5 8 2 1 6"></polygon>
                    <line x1="8" y1="2" x2="8" y2="19"></line>
                    <line x1="16" y1="5" x2="16" y2="22"></line>
                  </svg>

                  Open Map
                </span>
              </div>

              <div
                onClick={handleOpenBoth}
                style={{ width: '100%', borderRadius: '6px', padding: '2px 2px' }}

                onMouseEnter={e => {
                  (e.target.style.backgroundColor = '#f0f0f0')
                  e.target.style.color = 'black'
                  e.target.style.cursor = 'pointer'
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'black';
                }}
                onMouseLeave={e => {
                  (e.target.style.backgroundColor = 'transparent')
                  e.target.style.color = 'white'
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.stroke = 'white';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    viewBox="0 0 28 24"
                  >

                    <rect x="1" y="4" width="12" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="9" x2="13" y2="9"></line>
                    <line x1="5" y1="2" x2="5" y2="6"></line>
                    <line x1="9" y1="2" x2="9" y2="6"></line>


                    <path d="M20 21s6-5.686 6-10a6 6 0 1 0-12 0c0 4.314 6 10 6 10z"></path>
                    <circle cx="20" cy="11" r="2"></circle>
                  </svg>

                  Open Both
                </span>
              </div>
            </div>
          )}
        </div>
        {hasTitle && <div style={{ textAlign: 'center', backgroundColor: 'white' }}>
          <div style={{
            fontFamily: 'Satoshi',
            gap: '8px',
            fontSize: '12px',
            display: 'flex', alignItems: 'center'
          }}>

            <h1 >{label}</h1>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" onclick={handleClick}>
              <path d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345L15.7238 5.72328C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865C16.3351 6.57602 16.335 6.75631 16.2807 6.92368C16.2189 7.11382 16.054 7.27865 15.7245 7.60819L15.7238 7.6089L13.3332 9.99944M9.99992 6.66611L13.3332 9.99944" stroke="#D36433" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>



          </div>






        </div>}
        <div style={{ display: openCalendar ? 'block' : 'none', marginTop: hasTitle ? '' : '40px' }}>

          <div class="calendar-wrapper">



            {<div id="calendar" ref={calendarRef} style={{

              width: '100%',
              maxWidth: '100%',


              margin: '0 auto',
              borderTop: 'none',
            }}></div>}


          </div>
          {isModalOpen && (
            <div
              ref={modalRef}
              className="google-modal"
              style={{ position: 'absolute', top: '20%', width: '150px', height: 'auto' }}
            >
              <div ref={contentRef}>
                <h3 style={{ marginBottom: '8px', fontSize: '16px', color: '#333' }}>Add Resource</h3>

                <label style={{ fontSize: '13px', color: '#444' }}>Category</label><br />
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={{
                    width: '100%',
                    outline: 'none',
                    backgroundColor: '#f4f7f8',
                    border: 'none',
                    fontSize: '15px',
                    borderBottom: '1px solid gray',
                    fontWeight: '600',
                  }}
                /><br />

                <label style={{ fontSize: '13px', color: '#444' }}>Rooms</label><br />
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    type="text"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    placeholder="Enter room"
                    style={{
                      flexGrow: 1,
                      outline: 'none',
                      backgroundColor: '#f4f7f8',
                      border: 'none',
                      fontSize: '13px',
                      borderBottom: '1px solid gray',
                      fontWeight: '600',
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = roomInput.trim();
                      if (trimmed && !roomTitles.includes(trimmed)) {
                        setRoomTitles([...roomTitles, trimmed]);
                        setRoomInput('');
                      }
                    }}
                    style={{
                      padding: '2px 3px',
                      fontSize: '12px',
                      backgroundColor: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ marginTop: '6px' }}>
                  {roomTitles.map((title, index) => (
                    <div
                      key={index}
                      style={{
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#eaeaea',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        marginBottom: '4px',
                      }}
                    >
                      <span>{title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomTitles(roomTitles.filter((_, i) => i !== index))
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#c00',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '9px' }}>
                  <button
                    onClick={closeModal}
                    style={{
                      padding: '6px 10px',
                      background: '#eee',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#333'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addNewResource}
                    style={{
                      padding: '6px 10px',
                      background: '#1a73e8',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
          <GroupSettingsModal
            open={groupModalOpen}
            groupValue={currentGroupValue}
            groupRooms={calendarApi.current?.getResources().filter(r => r.extendedProps.group === currentGroupValue) || []}
            onRemoveRoom={(roomId) => {
              const calendar = calendarApi.current;
              const resource = calendar.getResourceById(roomId);
              if (resource) resource.remove();
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
            }}

            updateGroupName={(oldGroup, newGroup) => {
              const calendar = calendarApi.current;
              if (!calendar) return;

              calendar.getResources().forEach(resource => {
                if (resource.extendedProps.group === oldGroup) {
                  resource.setExtendedProp('group', newGroup);
                }
              });
            }}
          />
          {isEventModalOpen && <ResourceEventModal  calendarApi={calendarApi} currentResourceId={currentResourceId} setCurrentResourceId={setCurrentResourceId} allEvents={allEvents} setAllEvents={setAllEvents} isEventModalOpen={isEventModalOpen} setIsEventModalOpen={setIsEventModalOpen}/>}

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
              {eventViewSelected &&
                <div>
                  <div class="event-list">
                    {eventInView.length === 0 && <p>No events in view.</p>}
                    {visibleEvents.map(ev => (

                      <div key={ev.id} class="event-box">
                        {openEditModal && <EditEvent editingEvent={ev} setEditEventOpen={setOpenEditModal} calendarApi={calendarApi} setEventInView={setEventInView} />}

                        <div class="event-box_color" style={{
                          backgroundColor: ev.classNames[0] === 'readingPlan' ? '#67C23A' : '#409EFF'
                        }}></div>
                        <div class="event-box_time">
                          <span>{ev.extendedProps.startTime ? convertTo12Hour(ev.extendedProps.startTime) : ""}</span>
                          <span>{ev.extendedProps.startTime && ev.extendedProps.endTime ? getHumanDuration(ev.extendedProps.startTime, ev.extendedProps.endTime) : 'All Day'}</span>
                        </div>
                        <div class="event-box_about">
                          <span class="event-box_about-heading">{ev.title}</span>
                          <span class="event-box_about-desc">{ev.extendedProps.description}</span>
                        </div>
                        <div class="event-box_icon">

                          {ev.extendedProps.isReapeating && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                          </svg>}

                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" onclick={() => setMenuOpenForId(ev.id)} >
                            <circle cx="12" cy="6" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="18" r="2" />
                          </svg>
                          {menuOpenForId === ev.id && <Menu onClose={() => setMenuOpenForId(null)} setOpenEditModal={setOpenEditModal} onDelete={() => handleDelete_2(ev.id)} />}
                        </div>
                      </div>
                    ))}
                    {visibleCount < eventInView.length && (
                      <button onClick={() => setVisibleCount(c => Math.min(c + 3, eventInView.length))}>
                        View More →
                      </button>
                    )}
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        {groupMenu.position && (
          <Menu
            position={groupMenu.position}
            groupValue={groupMenu.groupValue}
            onClose={() => setGroupMenu({ groupValue: null, position: null })}
            onDelete={(groupToDelete) => {
              const calendar = calendarApi.current;
              if (!calendar) return;

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


        {modalOpen ? <CustomModal onClose={onCloseModal} setModalOpen={setModalOpen} eventTitle={eventTitle} setEventTitle={setEventTitle} eventEndDate={eventEndDate} setEventEndDate={setEventEndDate}
          eventStartDate={eventStartDate} setEventStartDate={setEventStartDate} eventDescription={eventDescription} setEventDescription={setEventDescription} eventLink={eventLink} setEventLink={setEventLink} setEventCreated={setEventCreated} selectedDays={selectedDays} setSelectedDays={setSelectedDays} selectedOption={selectedOption} setSelectedOption={setSelectedOption}
          eventStartTime={eventStartTime} setEventStartTime={setEventStartTime} eventEndDate={eventEndTime} setEventEndTime={setEventEndTime} addReadingPlans={addReadingPlans} calendarApi={calendarApi} /> : ''}

        {editEventOpen && <EditEvent editingEvent={editingEvent} editEventOpen={editEventOpen} setEditEventOpen={setEditEventOpen} calendarApi={calendarApi} setEventInView={setEventInView} />}







      </div >
    </>
  );
};

return App
