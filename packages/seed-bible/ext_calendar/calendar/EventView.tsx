const { useState } = os.appHooks;
const EditEvent = await thisBot.EditEvent();
const Menu = await thisBot.Menu();

function convertTo12Hour(time24) {
    const [hourStr, minute] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12; // Convert '0' to '12'
    return `${hour}:${minute} ${ampm}`;
}
function getHumanDuration(startTime, endTime, locale = 'en') {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    let start = sh * 60 + sm;
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
const EventView = ({ visibleEvents, calendarApi, setEventInView, visibleCount, setVisibleCount, eventInView }) => {
    const [openEditModal, setOpenEditModal] = useState(false)
    const [menuOpenForId, setMenuOpenForId] = useState(null);
    const handleDelete_2 = (id) => {
        setEventInView(prev => prev.filter((e) => e.id !== id))

        const evt = calendarApi.current.getEventById(id);
        if (evt) evt.remove();
    }

    return (
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


    )
}
return EventView