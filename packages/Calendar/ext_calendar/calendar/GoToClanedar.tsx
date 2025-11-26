const { useState } = os.appHooks;

const GoToCalendar = ({ calendarApi ,calendarView,setCalendarView}) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        right: "10px",
        top: "87px",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
    
      {hover && (
        <div
          style={{
            position: "absolute",
            top: "20px", 
            left: "50%",
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
          Go to Calendar
        </div>
      )}

      <button
        onClick={() => {calendarApi.current.changeView("dayGridMonth") 
        setCalendarView('dayGridMonth')
        }}
        style={{
          outline: "none",
          border: "none",
          backgroundColor: hover ? "lightgray" : "#f5f5f5",
          cursor: "pointer",
          padding: "6px 10px",
          borderRadius: "6px",
        }}
      >
        <svg
          style={{ color: hover ? "black" : "gray" }}
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          role="img"
          aria-label="Calendar grid"
          
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
  );
};

return GoToCalendar;
