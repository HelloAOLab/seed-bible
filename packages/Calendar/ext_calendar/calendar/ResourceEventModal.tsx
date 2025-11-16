const { useRef, useState, useEffect } = os.appHooks;

const ResourceEventModal = ({ calendarApi, currentResourceId, setCurrentResourceId, allEvents, setAllEvents, isEventModalOpen, setIsEventModalOpen, resourceDatee, resourceTime, resourceETime, modalPosition ,showSchedules}) => {
    const [resourceTitle, setResourceTitle] = useState('');

    const [resourceDate, setResourceDate] = useState(resourceDatee);
    const [resourceEndDate, setResourceEndDate] = useState(resourceDatee);
    const [resourceStartTime, setResourceStartTime] = useState(resourceTime);

    const [resourceUrl, setResourceEventUrl] = useState('');

    const [resourceEndTime, setResourceEndTime] = useState(resourceETime);
    const [resourceDescription, setResourceDescription] = useState('');
    const [isResourceEventModalOpen, setResourceEventModalOpen] = useState(false);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [hover, setHover] = useState(false);

    const [isCopyEvents, setIsCopyEvents] = useState(false);

    const eventModalRef = useRef(null);
    const dateInputRef = useRef(null);
    const resourceModalRef = useRef(null);


    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                isEventModalOpen &&
                eventModalRef.current &&
                !eventModalRef.current.contains(e.target)
            ) {
                setIsEventModalOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEventModalOpen]);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (resourceModalRef.current && !resourceModalRef.current.contains(e.target)) {
                setResourceEventModalOpen(false);
            }
        };

        if (isResourceEventModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isResourceEventModalOpen]);


    const handleAddResourceEvent = () => {
        if (!calendarApi.current || !currentResourceId) return;

        const newEvent = {
            title: resourceTitle,
            id: uuid(),
            start: `${resourceDate}T${resourceStartTime}`,
            end: `${resourceEndDate}T${resourceEndTime}`,
            classNames: ['schedule'],
            extendedProps: { description: resourceDescription, link: resourceUrl, type: "events", isResource: true },
            resourceId: currentResourceId
        };
        calendarApi.current.addEvent(newEvent);
        setAllEvents(prev=>[...prev,newEvent]);
      
       


      
        setResourceTitle('');
        setResourceDate(new Date().toLocaleDateString('en-CA'));
        setResourceEndDate(new Date().toLocaleDateString('en-CA'))
        setResourceStartTime('07:00');
        setResourceEventUrl('');
        setCurrentResourceId('');
        setIsEventModalOpen(false);
    };
    console.log(allEvents, 'ppppppppppp')
    const handleEventFetch = () => {

        const selectedDate = dateInputRef.current?.value;

        if (!selectedDate) return
        console.log(allEvents)



        const events = allEvents.filter(event => {
            const eventDate = event.start?.split('T')[0];
            return eventDate === selectedDate && event.extendedProps.isResource !== true;
        });


        setSelectedEvents(events);
        setResourceEventModalOpen(true);
    };
    const handleCopy = (event) => {
        setIsCopyEvents(false)
        setResourceEventModalOpen(false)
        const startISO = event.startStr || event.start;
        const endISO = event.endStr || event.end;

        const startDate = startISO.split('T')[0];
        const endDate = endISO ? endISO.split('T')[0] : startDate;

        const startTime = new Date(startISO).toLocaleTimeString('en', {
            timeStyle: 'short',
            hour12: false
        });
        const endTime = endISO
            ? new Date(endISO).toLocaleTimeString('en', { timeStyle: 'short', hour12: false })
            : '';
        const eventInfo = JSON.stringify({
            Title: event.title,
            Start: event.startStr || event.start,
            End: event.endStr || event.end,
            Description: event.extendedProps?.description || 'N/A',
        }, null, 2);

        os.setClipboard(eventInfo);

        setResourceTitle(event.title);
        setResourceDate(startDate);
        setResourceEndDate(endDate);
        setResourceStartTime(startTime);
        setResourceEndTime(endTime);
        setResourceDate((event.startStr || event.start).split('T')[0]);
        setResourceDescription(event.extendedProps?.description || '');
        setResourceEventUrl(event.extendedProps?.link || '');
    };



    return (
        <div className="google-modal" ref={eventModalRef} style={{
            zIndex: 1000, position: 'absolute', top: modalPosition.y - 100 + "px",
            left: modalPosition.x - 220 + "px"
        }}>




            <div className="gm-input-svg">
                <div style={{ position: 'relative' }}>
                    {isResourceEventModalOpen && (
                        <div
                            ref={resourceModalRef}
                            id="event-modal"
                            style={{
                                fontFamily: 'Satoshi',
                                backgroundColor: '#f4f7f8',
                                position: 'absolute',
                                color: 'black',
                               
                                zIndex: '999',
                                boxShadow: '2px 2px 5px gray',
                                borderRadius: '20px',
                                padding: '8px',
                                width: '220px',
                            }}
                        >
                            <h3>Events for Selected Date</h3>
                            <ul style={{ marginTop: '10px' }}>
                                {selectedEvents.length === 0 ? (
                                    <li >No events found for this date.</li>
                                ) : (
                                    selectedEvents.map((event, index) => (
                                        <li key={index} className="event-item" >
                                            <span className="event-title">{event.title}</span>
                                            <button
                                                className="copy-btn"


                                                onClick={() => handleCopy(event)}
                                            >
                                                Copy
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>

                            <button
                                onClick={() => setResourceEventModalOpen(false)}
                                style={{ marginTop: '10px', padding: '5px 10px' }}
                            >
                                Close
                            </button>
                        </div>
                    )}
                    {hover && (
                        <div
                            style={{
                                position: "absolute",
                                top: "20px", // above the button
                                left: '5px',
                                transform: "translateX(-50%)",
                                backgroundColor: "black",
                                color: "white",
                                fontSize: "8px",
                                padding: "1px 2px",
                                borderRadius: "4px",
                                whiteSpace: "nowrap",
                                zIndex: 10,
                            }}
                        >
                            copy events
                        </div>
                    )}
                    <svg
                        onclick={() => setIsCopyEvents(prev => !prev)}
                        onmouseenter={() => setHover(true)}
                        onmouseleave={() => setHover(false)}
                        style={{ color: hover ? 'black' : 'gray' }}

                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        viewBox="0 0 24 24"

                    >
                        <rect x="9" y="9" width="12" height="12" rx="2" ry="2" />
                        <rect x="3" y="3" width="12" height="12" rx="2" ry="2" />
                    </svg>
                </div>
                <input
                    type="text"
                    id="popup-title"
                    placeholder="Add title"
                    className="gm-input title-res"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                />
            </div>

            {isCopyEvents &&
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>


                    <svg


                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        stroke="gray"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="6" cy="7" r="2" />
                        <circle cx="6" cy="12" r="2" />
                        <circle cx="6" cy="17" r="2" />
                        <line x1="10" y1="7" x2="20" y2="7" />
                        <line x1="10" y1="12" x2="20" y2="12" />
                        <line x1="10" y1="17" x2="20" y2="17" />
                    </svg>


                    <input
                        ref={dateInputRef}
                        type="date"
                        placeholder="Events for date"
                        className="gm-input-date gm-input gm-input-date-input"
                        style={{ width: '37%' }}
                    />

                    <button onClick={handleEventFetch} className="events-btn">Events</button>
                </div>
            }



            <div className="gm-modal-event">
                <div className="gm-event">
                    <div className="gm-input-date">
                        <svg width="24" height="24" stroke="gray" fill="none" viewBox="0 0 24 24">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <div className="gm-input-date-input">
                            <input
                                type="date"
                                className="gm-input-date-input"
                                value={resourceDate}
                                onChange={(e) => setResourceDate(e.target.value)}
                            />
                            <span className="gm-input-date-span">to</span>
                            <input
                                type="date"
                                className="gm-input-date-input"
                                value={resourceEndDate}
                                onChange={(e) => setResourceEndDate(e.target.value)}

                            />
                        </div>
                    </div>

                    <div className="gm-time-picker gm-input-svg" >
                        <svg width="24" height="24" stroke="gray" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="time"
                                className="gm-input-start_time"
                                value={resourceStartTime}
                                onChange={(e) => setResourceStartTime(e.target.value)}
                            />
                            <span style={{ color: 'gray' }}>to</span>
                            <input
                                type="time"
                                className="gm-input-end_time"
                                value={resourceEndTime}
                                onChange={(e) => setResourceEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="gm-input-svg">
                        <svg width="24" height="24" stroke="gray" fill="none" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <line x1="10" y1="9" x2="8" y2="9" />
                        </svg>
                        <textarea
                            id="popup-description"
                            placeholder="Add Description"
                            className="gm-input-description"
                            rows="2"
                            value={resourceDescription}
                            onChange={(e) => setResourceDescription(e.target.value)}
                        />
                    </div>

                    <div className="gm-input-svg">
                        <svg width="24" height="24" stroke="gray" fill="none" viewBox="0 0 24 24">
                            <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
                            <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Link"
                            className="gm-input-link"
                            value={resourceUrl}
                            onChange={(e) => setResourceEventUrl(e.target.value)}
                        />
                    </div>




                </div>
            </div>

            <div className="gm-actions">
                <button className="gm-button" onClick={handleAddResourceEvent}>Save</button>
                <button className="gm-button cancel" onClick={() => setIsEventModalOpen(false)}>Cancel</button>
            </div>
        </div>

    )


};
return ResourceEventModal;