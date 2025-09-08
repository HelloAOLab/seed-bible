const { createContext, useContext, useRef, useState, useEffect } = os.appHooks;

const Menu = ({ onClose, setOpenEditModal, onDelete, position, groupValue, isResourceGroupHiding, groupMenu, setGroupMenu, setIsResourceGroupHiding, setResourcesByDate, calendarApi }) => {
  const menuRef = useRef();
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const resourceGroupShaded = document.querySelector('.fc-cell-shaded');




  return (
    <div
      ref={menuRef}
      style={{
        fontFamily: 'Satoshi',
        position: 'absolute',
        right: position ? `` : '12px',
        left: position ? "90px" : '',

        top: position ? `${position.top - 20}px` : '10px',
        borderRadius: '4px',
        padding: '4px 2px 4px 2px',
        backgroundColor: '#f4f7f8',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '5px',
          backgroundColor: '#f4f7f8',
        }}
      >
        <div
          onClick={() => {
            setOpenEditModal(true);
            onClose();
          }}
          onMouseEnter={() => setHovered('edit')}
          onMouseLeave={() => setHovered(null)}
          style={{
            fontSize: '15px',
            cursor: 'pointer',
            borderRadius: '4px',


            width: '100%',
            borderRadius: '4px',
            backgroundColor: hovered === 'edit' ? '#d3d3d3' : 'transparent',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 20 20"
              fill="none"
              stroke="black"
            >
              <path
                d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345L15.7238 5.72328C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865C16.3351 6.57602 16.335 6.75631 16.2807 6.92368C16.2189 7.11382 16.054 7.27865 15.7245 7.60819L15.7238 7.6089L13.3332 9.99944M9.99992 6.66611L13.3332 9.99944"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Edit
          </span>
        </div>

        <div
          onClick={() => {
            onDelete(groupValue || '')
            onClose()
          }}
          onMouseEnter={() => setHovered('delete')}
          onMouseLeave={() => setHovered(null)}
          style={{
            fontSize: '15px',
            cursor: 'pointer',
            borderRadius: '4px',

            width: '100%',
            borderRadius: '4px',
            backgroundColor: hovered === 'delete' ? '#d3d3d3' : 'transparent',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              height="15"
              width="15"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
                clipRule="evenodd"
              />
            </svg>
            Delete
          </span>
        </div>
        <div
          onClick={() => {
            setIsResourceGroupHiding(prev => !prev);

            const groups = document.querySelectorAll('.fc-resource-group');

            groups.forEach(group => {
              const label = group.innerText.trim();

              if (label === groupValue && !isResourceGroupHiding) {
                // shrink the group row completely
                group.style.overflow = "";
                group.style.height = '0';
                group.style.display = "none"; // fully collapse

                // check if replacement svg button already exists
                if (!document.querySelector(`#collapsed-btn-${label}`)) {
                  const btn = document.createElement("button");
                  btn.id = `collapsed-btn-${label}`;
                  btn.style.position = "absolute";

                  // position button near the hidden row


                  btn.style.background = "transparent";
                  btn.style.border = "none";
                  btn.style.cursor = "pointer";
                  btn.style.padding = "2px";
                  btn.style.top = `${position.top - 10}px`;

                  btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="gray">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        `;

                  // when clicked → open menu again
                  btn.onclick = (e) => {

                    e.stopPropagation();
                    const rect = btn.getBoundingClientRect();
                    setGroupMenu({
                      groupValue,
                      position: {
                        top: rect.top + window.scrollY + 20,
                        left: rect.left + window.scrollX - 30
                      }
                    });
                  };


                  // append into calendar container
                  document.querySelector(".fc").appendChild(btn);
                }
                calendarApi.current.setOption('resourceAreaWidth', `${Math.floor(Math.random() * 200 + 120)}px`)
              }
              else {

                group.style.display = "block";
                group.style.height = '100%';
                

                calendarApi.current.setOption('resourceAreaWidth', `${Math.floor(Math.random() * 200 + 120)}px`)


              }
            });

            onClose();
          }}











          onMouseEnter={() => setHovered('hide')}
          onMouseLeave={() => setHovered(null)}
          style={{
            fontSize: '15px',
            cursor: 'pointer',
            borderRadius: '4px',

            width: '100%',
            borderRadius: '4px',
            backgroundColor: hovered === 'hide' ? '#d3d3d3' : 'transparent',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              height="15"
              width="15"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 5c-7.633 0-11 7-11 7s1.753 3.41 5.247 5.438l-2.707 2.707 1.414 1.414 16.97-16.97-1.414-1.414-2.717 2.717C16.65 6.383 14.415 5 12 5zm0 2c1.635 0 3.118.802 4.373 1.908l-1.461 1.461A3.99 3.99 0 0 0 12 9c-1.654 0-3 1.346-3 3 0 .739.268 1.414.708 1.938l-1.462 1.462A5.985 5.985 0 0 1 6 12c0-3.309 2.691-6 6-6zm0 10c-1.64 0-3.122-.8-4.374-1.906l1.463-1.463A3.99 3.99 0 0 0 12 15c1.654 0 3-1.346 3-3 0-.737-.266-1.41-.705-1.934l1.461-1.461A5.978 5.978 0 0 1 18 12c0 3.309-2.691 6-6 6z" />
            </svg>
            {!isResourceGroupHiding ? 'hide' : 'show'}


          </span>
        </div>
      </div>
    </div>
  );
};
return Menu;