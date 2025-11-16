const { createContext, useContext, useRef, useState, useEffect } = os.appHooks;

const GroupSettingsModal = ({
  open,
  groupValue,
  onClose,
  onDeleteGroup,
  onAddRoom,
  updateGroupName,
  onRemoveRoom,
  groupRooms = []
}) => {
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [groupName, setGroupName] = useState(groupValue);
  const [localRooms, setLocalRooms] = useState(groupRooms);
  const [showAllRooms, setShowAllRooms] = useState(false);

  useEffect(() => {
    setLocalRooms(groupRooms);
    setGroupName(groupValue);
  }, [groupValue, groupRooms]);

  const handleAddRoom = () => {
    if (newRoomTitle.trim()) {
      const newRoom = {
        id: `${groupValue}-${Date.now()}`,
        title: newRoomTitle.trim(),
        group: groupValue,
      };

      onAddRoom(newRoom);                         // Update FullCalendar
      setLocalRooms(prev => [...prev, newRoom]);  // Update local state
      setNewRoomTitle('');
    }
  };

  const handleDelete = () => {
    onDeleteGroup(groupValue);
    onClose();
  };

  const handleSave = () => {
    updateGroupName(groupValue, groupName.trim());
    onClose();
  };

  const handleRemoveRoom = (roomId) => {
    onRemoveRoom(roomId); // remove from calendar
    setLocalRooms(prev => prev.filter(r => r.id !== roomId)); // remove from UI
  };

  if (!open) return null;
  const visibleRooms = showAllRooms ? localRooms : localRooms.slice(0, 3);

  return (
    <div
      style={{
        top: '20%',
        left: '40%',
        transform: 'translateX(-50%)',
        position: 'absolute',
        padding: '16px',
        background: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 1000,
        width: '280px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#333' }}>
        Edit Group: <span style={{ color: '#555' }}>{groupValue}</span>
      </h3>

      <label style={{ fontSize: '13px', color: '#555' }}>Group Name</label>
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          margin: '6px 0 12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
        }}
      />

      <label style={{ fontSize: '13px', color: '#555' }}>Add Room to Group</label>
      <input
        type="text"
        placeholder="Room title"
        value={newRoomTitle}
        onChange={(e) => setNewRoomTitle(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          margin: '6px 0 8px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
        }}
      />
      <button
        onClick={handleAddRoom}
        style={{
          width: '100%',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '6px',
          marginBottom: '8px',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        + Add Room
      </button>

      <div>
        <h4 style={{ margin: '8px 0 4px' }}>Rooms</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {(showAllRooms ? localRooms : localRooms.slice(0, 3)).map(room => (
            <li
              key={room.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span>{room.title}</span>
              <button
                onClick={() => handleRemoveRoom(room.id)}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {localRooms.length > 3 && (
          <button
            onClick={() => setShowAllRooms(prev => !prev)}
            style={{
              marginTop: '4px',
              backgroundColor: 'transparent',
              color: '#007bff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              padding: 0,
            }}
          >
            {showAllRooms ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>


      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button
          onClick={handleSave}
          style={{
            flex: '1 1 48%',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Save
        </button>
        <button
          onClick={onClose}
          style={{
            flex: '1 1 48%',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

return GroupSettingsModal;
