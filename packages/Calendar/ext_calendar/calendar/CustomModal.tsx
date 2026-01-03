const { useSideBarContext } = await import("app.hooks.sideBar");

const { useState, useEffect, useRef } = os.appHooks;

const CustomRepeatModal = await thisBot.RepeatModal();
import { useCalendar } from "ext_calendar.calendar.CalendarContext";

const CustomModal = ({
  setModalOpen,
  handleAddReadingPlans,
  calendarApi,
  setCalendarView,
  setScheduleTitle,
  setScheduleDescription,
}) => {
  const { t } = useSideBarContext();
  const [mode, setMode] = useState("event"); // 'event' or 'readingPlans'

  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventCreated, setEventCreated] = useState(false);
  const [eventLink, setEventLink] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedOption, setSelectedOption] = useState("No Repeat");
  const [repeat, setRepeat] = useState("No Repeat");

  const [checked, setChecked] = useState({});

  const [showCustomRepeat, setShowCustomRepeat] = useState(false);

  const handleEvent = () => {
    console.log(eventStartDate, eventEndDate);
    const eventData = {
      title: eventTitle,
      start: eventStartTime
        ? `${eventStartDate}T${eventStartTime}:00`
        : eventStartDate,
      end: eventEndTime ? `${eventEndDate}T${eventEndTime}:00` : eventEndDate,
      allDay: false,

      color: "white",
      theme: "simple-borderless",
      classNames: ["user-event"],
      extendedProps: {
        description: eventDescription,
        link: eventLink,
        isReapeating: false,
        type: "events",
      },
    };

    if (selectedOption === "custom") {
      eventData.daysOfWeek = selectedDays;
    }

    calendarApi.current.addEvent(eventData);
    setEventCreated(false);
  };

  const onCloseModal = () => {
    setModalOpen((prev) => !prev);
  };

  const modalRef = useRef(null);
  const customRepeatRef = useRef(null); // NEW
  let plays = globalThis["defaultplaylists"];

  const playListsFiltered = plays.filter((item) => item.readingPlanEnabled);

  const handleOverlayClick = (e) => {
    if (
      modalRef.current &&
      !modalRef.current.contains(e.target) &&
      (!customRepeatRef.current || !customRepeatRef.current.contains(e.target))
    ) {
      onClose?.(); // close only if clicked outside both modals
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleOverlayClick);
    return () => {
      document.removeEventListener("mousedown", handleOverlayClick);
    };
  }, []);
  const toggleCheckbox = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  function createScheduleFromAddScheduleInputs() {
    if (!calendarApi?.current) return;

    setCalendarView("resourceTimeline");
    calendarApi.current.changeView("resourceTimeline");

    const title = eventTitle || "Untitled";
    const description = eventDescription || "";

    const todayStr = new Date().toISOString().split("T")[0];

    const start = eventStartDate || todayStr;
    const end = eventEndDate || todayStr;

    const startTime = eventStartTime || "07:00:00";
    const endTime = eventEndTime || "19:00:00";

    calendarApi.current.setOption("slotMinTime", startTime);
    calendarApi.current.setOption("slotMaxTime", endTime);

    const endPlusOne = new Date(end);
    endPlusOne.setDate(endPlusOne.getDate() + 1);

    calendarApi.current.setOption("visibleRange", {
      start,
      end: endPlusOne.toISOString().split("T")[0],
    });

    setScheduleTitle(title);
    setScheduleDescription(description);

    calendarApi.current.gotoDate(start);
  }

  const renderEventFields = () => (
    <div className="gm-event">
      <div className="gm-input-date">
        <svg
          style={{ color: "gray" }}
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
        <div className="gm-input-date-input">
          <input
            type="date"
            value={eventStartDate}
            onChange={(e) => setEventStartDate(e.target.value)}
          />
          <span className="gm-input-date-span">{t("to")}</span>
          <input
            type="date"
            value={eventEndDate}
            onChange={(e) => setEventEndDate(e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <svg
          style={{ color: "gray" }}
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div style={{ display: "flex", gap: "6px" }}>
          <label
            style={{ display: "flex", fontSize: "10px", alignItems: "center" }}
          >
            <input
              type="time"
              name="startTime"
              value={eventStartTime}
              onChange={(e) => setEventStartTime(e.target.value)}
            />
          </label>
          <span>{t("to")}</span>
          <label
            style={{ display: "flex", fontSize: "10px", alignItems: "center" }}
          >
            <input
              value={eventEndTime}
              type="time"
              name="endTime"
              onChange={(e) => setEventEndTime(e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="gm-input-svg">
        <label htmlFor="repeatSelect">
          <svg
            style={{ color: "gray" }}
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </label>
        <select
          id="repeatSelect"
          value={selectedOption || "No Repeat"}
          onChange={(e) => {
            setSelectedOption(() => e.target.value);
            const val = e.target.value;
            if (val === "custom") {
              setShowCustomRepeat(true);
            } else {
              setRepeat(val);
            }
          }}
        >
          <option value="No Repeat">{t("noRepeat")}</option>
          <option value="custom">{t("custom")}</option>
        </select>
      </div>

      <div className="gm-input-svg">
        <svg
          style={{ color: "gray" }}
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        <textarea
          className="gm-input-description"
          placeholder={t("description")}
          rows="2"
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
        />
      </div>

      <div className="gm-input-svg">
        <svg
          style={{ color: "gray" }}
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
          <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
        </svg>
        <input
          type="text"
          className="gm-input-link"
          placeholder={t("linkOptional")}
          value={eventLink}
          onChange={(e) => setEventLink(e.target.value)}
        />
      </div>
    </div>
  );
  const addSchedule = () => {
    return (
      <div className="gm-event">
        <div className="gm-input-date">
          <svg
            style={{ color: "gray" }}
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

          <div className="gm-input-date-input">
            <input
              type="date"
              value={eventStartDate}
              onChange={() => setEventStartDate(eventCreated.target.value)}
            />
            <span className="gm-input-date-span">to</span>
            <input
              type="date"
              value={eventEndDate}
              onChange={() => setEventEndDate(eventCreated.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <svg
            style={{ color: "gray", flexShrink: 0 }}
            width="24"
            height="24"
            fill="none"
            stroke="gray"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              className="gm-input-start_time"
              type="time"
              value={eventStartTime}
              onChange={(e) => setEventStartTime(e.target.value)}
              style={{
                padding: "4px 6px",
                fontSize: "12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <span style={{ color: "gray" }}>to</span>
            <input
              className="gm-input-end_time"
              type="time"
              value={eventEndTime}
              onChange={(e) => setEventEndTime(e.target.value)}
              style={{
                padding: "4px 6px",
                fontSize: "12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>

        <div className="gm-input-svg">
          <label htmlFor="repeatSelect">
            <svg
              style={{ color: "gray" }}
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </label>

          <select
            id="repeatSelect"
            value={selectedOption || "no repeat"}
            onChange={(e) => {
              setSelectedOption(() => e.target.value);
              const val = e.target.value;
              if (val === "custom") {
                setShowCustomRepeat(true);
              } else {
                setRepeat(val);
              }
            }}
          >
            <option value="No Repeat">No Repeat</option>

            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="gm-input-svg">
          <svg
            style={{ color: "gray" }}
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>

          <textarea
            className="gm-input-description"
            placeholder="Add Description"
            rows={2}
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
          />
        </div>
      </div>
    );
  };

  const renderReadingPlans = () => (
    <div style={{ paddingLeft: "30px" }}>
      <h2
        style={{
          marginBottom: "16px",
          fontSize: "1.25rem",
          fontWeight: "bold",
          color: "black",
        }}
      >
        {t("availablePlaylists")}
      </h2>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {playListsFiltered.map((play) => (
          <li key={play.id} style={{ marginBottom: "10px", color: "black" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={!!checked[play.id]}
                onChange={() => toggleCheckbox(play.id)}
              />
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "5px 10px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  backgroundColor: "#f9f9f9",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#eee")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f9f9f9")
                }
              >
                {play.name}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const handleSave = () => {
    if (mode === "readingPlans") {
      const selected = playListsFiltered.filter((p) => checked[p.id]);
      handleAddReadingPlans(selected);
    } else {
      if (mode === "event") {
        handleEvent();
      } else {
        createScheduleFromAddScheduleInputs();
      }
    }
    onCloseModal?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(5px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <div ref={modalRef} className="google-modal">
        <input
          className="gm-input.title"
          type="text"
          placeholder={t("addTitle")}
          className="gm-input title"
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
        />

        <div className="gm-modal-select">
          <span
            className={`gm-modal-select-1 ${mode === "event" ? "gm-modal-select-item-selected" : ""}`}
            onClick={() => setMode("event")}
          >
            {t("event")}
          </span>
          {playListsFiltered.length > 0 && (
            <span
              className={`gm-modal-select-2 ${mode === "readingPlans" ? "gm-modal-select-item-selected" : ""}`}
              onClick={() => setMode("readingPlans")}
            >
              {t("readings")}
            </span>
          )}
          <span
            className={`gm-modal-select-2 ${mode === "schedule" ? "gm-modal-select-item-selected" : ""}`}
            onClick={() => setMode("schedule")}
          >
            {t("schedule")}
          </span>
        </div>

        <div className="gm-modal-event">
          {mode === "event"
            ? renderEventFields()
            : mode === "readingPlans"
              ? renderReadingPlans()
              : addSchedule()}
        </div>

        <div className="gm-actions">
          <button className="gm-button" onClick={handleSave}>
            {mode === "schedule" ? t("create") : t("save")}
          </button>
          <button className="gm-button cancel" onClick={onCloseModal}>
            {t("cancel")}
          </button>
        </div>
      </div>
      {showCustomRepeat && (
        <div ref={customRepeatRef}>
          <CustomRepeatModal
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
            initialDate={
              eventStartDate || new Date().toISOString().split("T")[0]
            }
            onClose={() => setShowCustomRepeat(false)}
            onSave={(days) => {
              setRepeat(`Custom (${days.join(", ")})`);
            }}
          />
        </div>
      )}
    </div>
  );
};

return CustomModal;
