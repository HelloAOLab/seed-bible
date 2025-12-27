const { useRef, useState, useEffect } = os.appHooks;

function formatDateTime(date) {
  if (!(date instanceof Date)) date = new Date(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return {
    startDate: `${year}-${month}-${day}`,
    startTime:
      hours === 0 && minutes === 0
        ? ""
        : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

function formatEndDateTime(date) {
  if (!(date instanceof Date)) return { date: "", time: "" };
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return {
    date: `${year}-${month}-${day}`,
    time:
      hours === 0 && minutes === 0
        ? ""
        : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

const isFullCalendarEvent = (event) =>
  typeof event.setStart === "function" && typeof event.setProp === "function";

const EditEvent = ({
  editingEvent,
  setEditEventOpen,
  calendarApi,
  setEventInView,
}) => {
  console.log(editingEvent);

  const isFCEvent = isFullCalendarEvent(editingEvent);
  const fcEvent = isFCEvent
    ? editingEvent
    : calendarApi?.current?.getEventById(editingEvent.id);

  if (!fcEvent) return null;

  const startRaw = fcEvent.start || new Date(editingEvent.start);
  const endRaw = fcEvent.end ?? null;
  console.log(fcEvent, "fcevent");

  const { startDate, startTime } = formatDateTime(startRaw);
  const { date: endDateInitial, time: endTimeInitial } =
    formatEndDateTime(endRaw);

  const [eventTitle, setEventTitle] = useState(fcEvent.title);
  const [eventStartDate, setEventStartDate] = useState(startDate);
  const [eventStartTime, setEventStartTime] = useState(startTime);
  const [eventEndDate, setEventEndDate] = useState(endDateInitial || startDate);
  const [eventEndTime, setEventEndTime] = useState(endTimeInitial);
  const [eventDescription, setEventDescription] = useState(
    fcEvent.extendedProps?.description || ""
  );
  const [eventLink, setEventLink] = useState(fcEvent.extendedProps?.link || "");

  const handleCancel = () => setEditEventOpen(false);

  const handleEdit = () => {
    const hasTime = eventStartTime !== "" && eventEndTime !== "";
    const startStr = hasTime
      ? `${eventStartDate}T${eventStartTime}`
      : eventStartDate;
    const endStr = eventEndDate
      ? hasTime
        ? `${eventEndDate}T${eventEndTime}`
        : eventEndDate
      : "";

    const newStart = new Date(startStr);
    let newEnd = endStr ? new Date(endStr) : null;
    console.log(newEnd, "endstr");

    if (isNaN(newStart.getTime())) return alert("Invalid start date/time");

    const calendar = calendarApi?.current;
    if (!calendar) return;

    const oldEvent = calendar.getEventById(editingEvent.id);
    const resourceIds = editingEvent?._def?.resourceIds || [];
    if (resourceIds.length <= 0) {
      if (oldEvent) {
        oldEvent.setProp("title", eventTitle);
        oldEvent.setStart(newStart);
        oldEvent.setEnd(newEnd);
        oldEvent.setAllDay(!hasTime);

        oldEvent.setExtendedProp("description", eventDescription);
        oldEvent.setExtendedProp("link", eventLink);
      }
    } else {
      oldEvent.setProp("title", eventTitle);
      oldEvent.setStart(newStart);
      oldEvent.setEnd(newEnd);
      oldEvent.setAllDay(!hasTime);

      // Resource (IMPORTANT)
      if (resourceIds) {
        oldEvent.setResources([resourceIds[0]]); // for resource calendar
      }

      // Class names
      oldEvent.setProp("classNames", editingEvent.classNames || []);

      // Extended props
      oldEvent.setExtendedProp("description", eventDescription);
      oldEvent.setExtendedProp("link", eventLink);
    }
    const allEvents = calendarApi.current.getEvents();

    setEventInView((prev) =>
      prev.map((ev) =>
        ev.id === editingEvent.id
          ? {
              ...ev,
              title: eventTitle,
              start: newStart.toISOString(),
              end: newEnd.toISOString(),
              allDay: !hasTime,
              extendedProps: {
                ...ev.extendedProps,
                description: eventDescription,
                link: eventLink,
                startTime: eventStartTime,
                endTime: eventEndTime,
              },
            }
          : ev
      )
    );

    setEditEventOpen(false);
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
      <div className="google-modal">
        <input
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          className="gm-input title"
          type="text"
          placeholder="Title"
        />
        <div className="gm-event">
          <div className="gm-input-date">
            <input
              type="date"
              value={eventStartDate}
              onChange={(e) => setEventStartDate(e.target.value)}
            />
            <span className="gm-input-date-span">to</span>
            <input
              type="date"
              value={eventEndDate}
              onChange={(e) => setEventEndDate(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="time"
              value={eventStartTime}
              onChange={(e) => setEventStartTime(e.target.value)}
            />
            <span>to</span>
            <input
              type="time"
              value={eventEndTime}
              onChange={(e) => setEventEndTime(e.target.value)}
            />
          </div>
          <textarea
            className="gm-input-description"
            rows="2"
            placeholder="Description"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
          />
          <input
            type="text"
            className="gm-input-link"
            placeholder="Link (optional)"
            value={eventLink}
            onChange={(e) => setEventLink(e.target.value)}
          />
        </div>
        <div className="gm-actions">
          <button className="gm-button" onClick={handleEdit}>
            Save
          </button>
          <button className="gm-button cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

return EditEvent;
