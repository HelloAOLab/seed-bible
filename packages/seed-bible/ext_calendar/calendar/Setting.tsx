const Setting = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleToggle = () => setOpen(prev => !prev);

  const handleOptionClick = (option) => {
    console.log('Selected:', option);
    if (option === 'calendar') {
      // Open calendar logic
    } else if (option === 'map') {
      // Open map logic
    } else if (option === 'both') {
      // Open both
    }
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <button onClick={handleToggle} className="setting-button">
        Settings ⚙️
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
            zIndex: 999,
            padding: '8px',
            width: '150px'
          }}
        >
          <div className="dropdown-item" onClick={() => handleOptionClick('calendar')}>Open Calendar</div>
          <div className="dropdown-item" onClick={() => handleOptionClick('map')}>Open Map</div>
          <div className="dropdown-item" onClick={() => handleOptionClick('both')}>Open Both</div>
        </div>
      )}
    </div>
  );
};
return Setting;