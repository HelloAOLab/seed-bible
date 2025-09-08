const { useEffect, useRef, useState } = os.appHooks;
const ResourceHeaderModal = ({ calendarApi, isModalOpen, setIsModalOpen, resourcesByDate, setResourcesByDate, resourcesRef,setIsResourceGroupHiding }) => {
    const [roomInput, setRoomInput] = useState('');
    const [roomTitles, setRoomTitles] = useState([]);
    const [platform, setPlatform] = useState('');

    const modalRef = useRef(null);
    const contentRef = useRef(null);
    useEffect(() => {
        resourcesRef.current = resourcesByDate;
    }, [resourcesByDate]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                isModalOpen &&
                modalRef.current?.style.display !== 'none' &&
                contentRef.current &&
                !contentRef.current.contains(e.target)
            ) {
                closeModal();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isModalOpen]);
    


    const addNewResource = () => {
        
       
        if (!calendarApi.current) return;


        const currentDate = calendarApi.current.view.currentStart.toLocaleDateString('en-CA');
            

        const newResources = roomTitles.map((room, index) => ({
            id: `room-${Date.now()}-${index}`,
            title: room,
            group: platform,
        }));


        setResourcesByDate((prev) => {
            const updated = {
                ...prev,
                [currentDate]: [...(prev[currentDate] || []), ...newResources],
            };


            calendarApi.current.setOption("resources", updated[currentDate]);

            return updated;
        });

        // Reset modal inputs
        setPlatform("");
        setRoomInput("");
        setRoomTitles([]);
        setIsModalOpen(false);
    };


    const closeModal = () => setIsModalOpen(false);

    return (
        <div
            ref={modalRef}
            className="google-modal"
            style={{ position: 'absolute', top: '20%', width: '150px', height: 'auto' }}
        >
            <div ref={contentRef}>
                <h3 style={{ marginBottom: '8px', fontSize: '16px', color: '#333' }}>Add Resource</h3>

                <label style={{ fontSize: '13px', color: '#444' }}>Category</label><br />
                <input
                    type="text"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    style={{
                        width: '100%',
                        outline: 'none',
                        backgroundColor: '#f4f7f8',
                        border: 'none',
                        fontSize: '15px',
                        borderBottom: '1px solid gray',
                        fontWeight: '600',
                    }}
                /><br />

                <label style={{ fontSize: '13px', color: '#444' }}>Subcategory</label><br />
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                        type="text"
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        placeholder="Enter room"
                        style={{
                            flexGrow: 1,
                            outline: 'none',
                            backgroundColor: '#f4f7f8',
                            border: 'none',
                            fontSize: '13px',
                            borderBottom: '1px solid gray',
                            fontWeight: '600',
                            minWidth: 0,
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const trimmed = roomInput.trim();
                            if (trimmed && !roomTitles.includes(trimmed)) {
                                setRoomTitles([...roomTitles, trimmed]);
                                setRoomInput('');
                            }
                        }}
                        style={{
                            padding: '2px 3px',
                            fontSize: '12px',
                            backgroundColor: '#1a73e8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        +
                    </button>
                </div>

                <div style={{ marginTop: '6px' }}>
                    {roomTitles.map((title, index) => (
                        <div
                            key={index}
                            style={{
                                fontSize: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#eaeaea',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                marginBottom: '4px',
                            }}
                        >
                            <span>{title}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRoomTitles(roomTitles.filter((_, i) => i !== index))
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#c00',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '9px' }}>
                    <button
                        onClick={closeModal}
                        style={{
                            padding: '6px 10px',
                            background: '#eee',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#333'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={addNewResource}
                        style={{
                            padding: '6px 10px',
                            background: '#1a73e8',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>

    )

}
return ResourceHeaderModal;