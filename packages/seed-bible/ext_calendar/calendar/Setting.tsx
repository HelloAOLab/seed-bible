const { useEffect } = os.appHooks
const Setting = ({ setOpenSetting, dropdownRef, setOpenCalendar, setMapViewSelected, setOpenMap, setHasTitle, hasTitle,calendarApi,setShowSchedules,showSchedules }) => {
  const handleToggle = () => setOpenSetting(prev => !prev);
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


  return (
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
      {calendarApi.current.view.type.includes('resourceTimeline')?'':<div
        onClick={()=>setShowSchedules(prev=>!prev)}
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
           
            <circle cx="12" cy="12" r="9" />
           
            <line x1="12" y1="12" x2="12" y2="7" />
            
            <line x1="12" y1="12" x2="16" y2="12" />
          </svg>



          {showSchedules ? 'Hide Schedules' : 'Show Schedules'}
        </span>


      </div>}
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
  );
};
return Setting;