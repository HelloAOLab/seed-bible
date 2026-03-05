function getDayDifference(startDateStr: any, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function stripTime(date: any) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateOnly(d: any) {
  return `${d.getFullYear()},${d.getMonth()},${d.getDate()}`;
}

function getDayHeaderFormat(width: any, viewType: any) {
  if (viewType.startsWith("timeGridDay")) {
    return { weekday: "long" };
  }
  if (viewType.startsWith("multiMonthYear")) {
    return { weekday: "narrow" };
  }

  if (width < 400) {
    return { weekday: "narrow" }; // S, M, T
  } else if (width < 700) {
    return { weekday: "short" }; // Sun, Mon, Tue
  } else {
    return { weekday: "long" }; // Sunday, Monday
  }
}
function isSameDate(date1: any, date2: any) {
  const d1 = new Date(date1);

  let d2;
  if (typeof date2 === "string") {
    const clean = date2.replace(/\s+/g, "");

    if (/[a-zA-Z]{3}-\d{1,2}-\d{4}/.test(clean)) {
      const [monthStr, day, year] = clean.split("-");
      const monthMap = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };
      d2 = new Date(year, monthMap[monthStr], parseInt(day));
    }
    // Try "DD-MM-YY" or "DD-MM-YYYY"
    else if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(clean)) {
      const [day, month, year] = clean.split("-").map(Number);
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

function updateCalendarHeader(calendar: any) {
  const width = calendar.el.offsetWidth;
  const viewType = calendar.view.type;
  const format = getDayHeaderFormat(width, viewType);
  calendar.setOption("dayHeaderFormat", format);
}

const dayNameToNumber = (dayName: any) => {
  const days = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };
  return days[dayName] || null;
};

function parseDashedDateToValidDate(dateStr: any) {
  const parts = dateStr.split("-").map((p) => p.trim());
  if (parts.length !== 3) return null;

  const [month, day, year] = parts;
  const formatted = `${month} ${day}, ${year}`;

  const date = new Date(formatted);
  return isNaN(date.getTime()) ? null : date;
}

const openSelf = async function () {
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
  const container = document.querySelector(".experience-container");
  const width = container?.clientWidth || 1200; // fallback

  if (width <= 600) return 2;
  if (width <= 1100) return 3;
  return 4;
};
function formatWeekdayDay(date: any) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
  }).format(date);
}
function loadEventsFromLocalStorage(calendarApi: any) {
  if (!calendarApi.current) return;

  const events = JSON.parse(localStorage.getItem("allEvents")) || [];

  calendarApi.current.removeAllEvents();
  calendarApi.current.addEventSource(events);
}
return {
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
};
