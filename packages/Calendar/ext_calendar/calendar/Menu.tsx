const { useSideBarContext } = await import("app.hooks.sideBar");

const { createContext, useContext, useRef, useState, useEffect } = os.appHooks;

const Menu = ({
  onClose,
  setOpenEditModal,
  onDelete,
  position,
  groupValue,
  setGroupMenu,
  calendarView,
  calendarApi,
  setHiddenGroups,
  hiddenGroups,
  menuOpenForId,
}) => {
  const { t } = useSideBarContext();
  const menuRef = useRef();
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  useEffect(() => {
    const container = document.querySelector(".fc");
    const buttons = document.querySelectorAll(".collapsed-btn"); // use class instead of id
    console.log(buttons);

    if (calendarView && container) {
      if (calendarView !== "resourceTimeline") {
        buttons.forEach((btn) => container.removeChild(btn));
      }
    }
  }, [calendarView]);

  return (
    <div
      ref={menuRef}
      style={{
        fontFamily: "Satoshi",
        position: "absolute",
        right: position ? `` : "12px",
        left: position ? (hiddenGroups[groupValue] ? "24px" : "53px") : "",

        top: position ? `${position.top - 7}px` : "23px",
        borderRadius: "10px",
        padding: "4px 2px 4px 2px",
        width: "80px",
        backgroundColor: "black",
        color: "white",

        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "5px",
          color: "white",
          backgroundColor: "black",
        }}
      >
        <div
          onClick={() => {
            setOpenEditModal(true);
            onClose();
          }}
          onMouseEnter={() => setHovered("edit")}
          onMouseLeave={() => setHovered(null)}
          style={{
            fontSize: "15px",
            cursor: "pointer",
            borderRadius: "4px",
            color: hovered === "edit" ? "black" : "white",

            width: "100%",
            borderRadius: "4px",
            backgroundColor: hovered === "edit" ? "white" : "transparent",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 20 20"
              fill="none"
              stroke={hovered === "edit" ? "black" : "white"}
            >
              <path
                d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345L15.7238 5.72328C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865C16.3351 6.57602 16.335 6.75631 16.2807 6.92368C16.2189 7.11382 16.054 7.27865 15.7245 7.60819L15.7238 7.6089L13.3332 9.99944M9.99992 6.66611L13.3332 9.99944"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("edit")}
          </span>
        </div>

        <div
          onClick={() => {
            onDelete(groupValue || "");
            onClose();
          }}
          onMouseEnter={() => setHovered("delete")}
          onMouseLeave={() => setHovered(null)}
          style={{
            fontSize: "15px",
            cursor: "pointer",
            borderRadius: "4px",
            color: hovered === "delete" ? "black" : "white",

            width: "100%",
            borderRadius: "4px",
            backgroundColor: hovered === "delete" ? "white" : "transparent",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg
              stroke={hovered === "delete" ? "black" : "white"}
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
            {t("delete")}
          </span>
        </div>
        {!menuOpenForId ? (
          <div
            onClick={() => {
              const groups = document.querySelectorAll(".fc-resource-group");

              groups.forEach((group) => {
                const label = group.innerText.trim();
                console.log(label);

                if (label === groupValue) {
                  const currentlyHidden = hiddenGroups[label] || false;

                  if (!currentlyHidden) {
                    // hide this group
                    group.style.overflow = "hidden";
                    group.style.height = "0";
                    group.style.display = "none";

                    // add collapsed button if missing
                    if (!document.querySelector(`#collapsed-btn-${label}`)) {
                      const btn = document.createElement("button");
                      btn.id = `collapsed-btn-${label}`;
                      btn.style.background = "transparent";
                      btn.style.border = "none";
                      btn.style.position = "fixed";
                      btn.style.cursor = "pointer";

                      btn.style.padding = "2px";
                      btn.style.top = `${position.top}px`;
                      btn.classList.add("collapsed-btn");

                      btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="gray">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          `;

                      btn.onclick = (e) => {
                        e.stopPropagation();
                        const rect = btn.getBoundingClientRect();
                        const top = rect.top + window.scrollY + 20;
                        const left = rect.left + window.scrollX - 200;
                        console.log("Menu position:", { top, left });

                        setGroupMenu({
                          groupValue,
                          position: { top, left },
                        });
                      };

                      // ✅ attach to the first "room" (expander) of this group only

                      document.querySelector(".fc").appendChild(btn);
                    }
                  } else {
                    // show this group again
                    group.style.display = "block";
                    group.style.height = "100%";

                    // remove the button if it exists
                    const btn = document.querySelector(
                      `#collapsed-btn-${label}`
                    );
                    if (btn) {
                      btn.remove();
                    }
                  }

                  // ✅ update state once
                  setHiddenGroups((prev) => ({
                    ...prev,
                    [label]: !currentlyHidden,
                  }));

                  calendarApi.current.setOption(
                    "resourceAreaWidth",
                    `${Math.floor(Math.random() * 200 + 120)}px`
                  );
                }
              });

              onClose();
            }}
            onMouseEnter={() => setHovered("hide")}
            onMouseLeave={() => setHovered(null)}
            style={{
              fontSize: "15px",
              cursor: "pointer",
              borderRadius: "4px",
              color: hovered === "hide" ? "black" : "white",

              width: "100%",
              borderRadius: "4px",
              backgroundColor: hovered === "hide" ? "white" : "transparent",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {hiddenGroups[groupValue] ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <title>Show</title>
                  <path
                    d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
                    stroke={hovered === "hide" ? "black" : "white"}
                    stroke-width="1.25"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                </svg>
              ) : (
                <svg
                  stroke={hovered === "hide" ? "black" : "white"}
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 24 24"
                  height="15"
                  width="15"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 5c-7.633 0-11 7-11 7s1.753 3.41 5.247 5.438l-2.707 2.707 1.414 1.414 16.97-16.97-1.414-1.414-2.717 2.717C16.65 6.383 14.415 5 12 5zm0 2c1.635 0 3.118.802 4.373 1.908l-1.461 1.461A3.99 3.99 0 0 0 12 9c-1.654 0-3 1.346-3 3 0 .739.268 1.414.708 1.938l-1.462 1.462A5.985 5.985 0 0 1 6 12c0-3.309 2.691-6 6-6zm0 10c-1.64 0-3.122-.8-4.374-1.906l1.463-1.463A3.99 3.99 0 0 0 12 15c1.654 0 3-1.346 3-3 0-.737-.266-1.41-.705-1.934l1.461-1.461A5.978 5.978 0 0 1 18 12c0 3.309-2.691 6-6 6z" />
                </svg>
              )}
              {hiddenGroups[groupValue] ? t("show") : t("hide")}
            </span>
          </div>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};
return Menu;
