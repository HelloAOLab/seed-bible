const { useState, useEffect } = os.appHooks;

const ToggleCalendarAndResources = ({ calendarApi,viewType,setViewType }) => {
  const [active, setActive] = useState(null); // 'clock' or 'calendar'

  useEffect(() => {
    if (calendarApi.current?.view?.type?.includes("resource")) {
      setActive("clock");
    } else {
      setActive("calendar");
    }
  }, [calendarApi]);

  const handleToggle = (type) => {
    setActive(type);
    if (!calendarApi.current) return;

    if (type === "clock") {
      // Switch to resource view
      calendarApi.current.changeView("resourceTimelineWeek");
      setViewType('resources');
    } else {
      // Switch to normal calendar view
      calendarApi.current.changeView("dayGridMonth");
      setViewType('calendar')
    }
  };

  return (
    <div

      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid black",
        width: "80px",
        height: "30px",
        borderRadius: "20px",
        overflow: "hidden",
        cursor: "pointer",
        position: "absolute",
        right: "20px",
        top: "50px",
      }}
    >
  

    
      <div
        onClick={() => handleToggle("calendar")}
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active === "calendar" ? "#e6f3ff" : "transparent",
          transition: "background-color 0.2s ease",
        }}
      >
        <svg
          style={{ color: "gray" }}
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <line x1="8" y1="2.5" x2="8" y2="6" />
          <line x1="16" y1="2.5" x2="16" y2="6" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <circle cx="7" cy="13" r="0.9" />
          <circle cx="12" cy="13" r="0.9" />
          <circle cx="17" cy="13" r="0.9" />
          <circle cx="7" cy="17" r="0.9" />
          <circle cx="12" cy="17" r="0.9" />
          <circle cx="17" cy="17" r="0.9" />
        </svg>
      </div>
        <div
        style={{
          height: "100%",
          width: "1px",
          backgroundColor: "black",
        }}
      ></div>
      <div
        onClick={() => handleToggle("clock")}
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active === "clock" ? "#e6f3ff" : "transparent",
          transition: "background-color 0.2s ease",
        }}
      >
        <svg
          style={{ color: "gray" }}
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="12" x2="12" y2="7" />
          <line x1="12" y1="12" x2="15" y2="15" />
        </svg>
      </div>
      
    </div>
  );
};

return  ToggleCalendarAndResources;
