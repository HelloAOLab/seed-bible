const { useState ,useEffect} = os.appHooks;
const CalendarTitle = ({setScheduleTitle,scheduleTitle,isSchedule}) => {
    const [label, setLabel] = useState(() => {
        return localStorage.getItem('label') || 'Initial Title';
    });
    console.log(scheduleTitle,'sasasasa')
    const schTitle=scheduleTitle.toUpperCase();
    useEffect(() => {

        localStorage.setItem('label', label);
    }, [label]);
    const handleClick = async () => {
        const labelVal = await os.showInput("", { title: 'Type calendar name' });
        if (labelVal) {
            setLabel(labelVal)
        }
    };
    return (
        <div style={{ textAlign: 'center', backgroundColor: 'white' }}>
            <div style={{
                fontFamily: 'Satoshi',
                gap: '8px',
                fontSize: '12px',
                display: 'flex', alignItems: 'center'
            }}>
                <h1 >{isSchedule?schTitle:label}</h1>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" onclick={handleClick}>
                    <path d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345L15.7238 5.72328C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865C16.3351 6.57602 16.335 6.75631 16.2807 6.92368C16.2189 7.11382 16.054 7.27865 15.7245 7.60819L15.7238 7.6089L13.3332 9.99944M9.99992 6.66611L13.3332 9.99944" stroke="#D36433" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </div>
        </div>


    )
}
return CalendarTitle;