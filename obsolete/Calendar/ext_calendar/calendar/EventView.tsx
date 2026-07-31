const { useSideBarContext } = await import("app.hooks.sideBar");
const { useState } = os.appHooks;

const EditEvent = await thisBot.EditEvent();
const Menu = await thisBot.Menu();

/* ---------------- helpers ---------------- */

function convertTo12Hour(time24) {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function getHumanDuration(startTime, endTime, locale = "en") {
  if (!startTime || !endTime) return "";

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  let start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end < start) end += 24 * 60;

  const diffMins = end - start;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  const fmt = (value, unit) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "long",
    }).format(value);

  if (hours && mins) return `${fmt(hours, "hour")} ${fmt(mins, "minute")}`;
  if (hours) return fmt(hours, "hour");
  return fmt(mins, "minute");
}

/* ---------------- component ---------------- */

const EventView = ({
  visibleEvents,
  calendarApi,
  setEventInView,
  visibleCount,
  setVisibleCount,
  eventInView,
}) => {
  const { t } = useSideBarContext();
  const [openEditModal, setOpenEditModal] = useState(false);
  const [menuOpenForId, setMenuOpenForId] = useState(null);

  const handleDelete = (id) => {
    setEventInView((prev) => prev.filter((e) => e.id !== id));
    const evt = calendarApi.current?.getEventById(id);
    if (evt) evt.remove();
  };

  return (
    <div>
      <div className="event-list">
        {eventInView.length === 0 && <p>{t("noEventsInView")}</p>}

        {visibleEvents.map((ev) => {
          const classNames = Array.isArray(ev.classNames) ? ev.classNames : [];

          const isReading = classNames.includes("readingPlan");

          const extendedProps = ev.extendedProps || {};

          return (
            <div key={ev.id} className="event-box">
              {openEditModal && (
                <EditEvent
                  editingEvent={ev}
                  setEditEventOpen={setOpenEditModal}
                  calendarApi={calendarApi}
                  setEventInView={setEventInView}
                />
              )}

              {/* left color bar */}
              <div
                className="event-box_color"
                style={{
                  backgroundColor: isReading ? "#67C23A" : "#409EFF",
                }}
              />

              {/* time */}
              <div className="event-box_time">
                <span>
                  {extendedProps.startTime
                    ? convertTo12Hour(extendedProps.startTime)
                    : ""}
                </span>
                <span>
                  {extendedProps.startTime && extendedProps.endTime
                    ? getHumanDuration(
                        extendedProps.startTime,
                        extendedProps.endTime
                      )
                    : t("allDay")}
                </span>
              </div>

              {/* title + description */}
              <div className="event-box_about">
                <span className="event-box_about-heading">{ev.title}</span>
                <span className="event-box_about-desc">
                  {extendedProps.description || ""}
                </span>
              </div>

              {/* icons */}
              <div className="event-box_icon">
                {extendedProps.isReapeating && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
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
                )}

                {/* menu dots */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => setMenuOpenForId(ev.id)}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="18" r="2" />
                </svg>

                {menuOpenForId === ev.id && (
                  <Menu
                    onClose={() => setMenuOpenForId(null)}
                    setOpenEditModal={setOpenEditModal}
                    onDelete={() => handleDelete(ev.id)}
                    menuOpenForId={menuOpenForId}
                  />
                )}
              </div>
            </div>
          );
        })}

        {visibleCount < eventInView.length && (
          <button
            onClick={() =>
              setVisibleCount((c) => Math.min(c + 3, eventInView.length))
            }
          >
            {t("viewMore")} →
          </button>
        )}
      </div>
    </div>
  );
};

return EventView;
