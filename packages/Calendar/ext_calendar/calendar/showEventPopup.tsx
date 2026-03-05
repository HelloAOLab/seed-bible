function formatToYYYYMMDD(date: any) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

const fnnn = async function () {
  console.log("11111111");
};

const openSelf = async function () {
  if (globalThis["Playlist_package"]) {
    console.log("2222");
    globalThis["Playlist_package"].onClick();
  } else {
    console.log("2222");
    const PlayList = await Playlist.tryInitPlaylistMaker();
    console.log(PlayList);
    if (PlayList) {
      const id = uuid();
      globalThis.PLAYLIST_PANEL_ID = id;

      AddApplication({
        id,
        App: <PlayList id={id} />,
        to: "panel",
        minWidth: "23rem",
      });
    }
  }
};

function showEventPopup(
  info: any,
  setPlaylistMode: any,
  setScheduleTitle: any,
  setScheduleDescription: any,
  handleAddReadingPlans: any,
  calendarApi: any,
  setCalendarView: any,

  setCustomDays: any,
  setRepeat,
  setShowCustomRepeat: any,
  setSelectedDays: any,
  customRepeatRef: any,
  setSelectedOption,
  selectedOption: any,
  calendarRef: any,
  onSubmit: any
) {
  let playListsFiltered = [];
  const readingPlays = globalThis["defaultplaylists"];
  playListsFiltered = readingPlays.filter((item) => item.readingPlanEnabled);

  const popup = document.createElement("div");
  const dayNumber = info.date.getDay();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = days[dayNumber];
  const date = info.date;
  const dateStr = formatToYYYYMMDD(info.date);
  console.log(dateStr);
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const endH = String(d.getHours() + 1).padStart(2, "0");

  const time = `${h}:${m}`;
  const endTime = `${endH}:${m}`;

  let val;
  let endVal;
  if (time === "00:00") {
    val = "";
    endVal = "";
  } else {
    endVal = endTime;

    val = time;
  }

  const checked = {};

  popup.addEventListener("mousedown", (e) => e.stopPropagation());

  popup.innerHTML = `
  <div class="google-modal">
    <input type="text" id="popup-title" placeholder="Add title" class="gm-input title" />
    <div class="gm-modal-select">
      <span class="gm-modal-select-1">Event</span>
      ${
        playListsFiltered.length > 0
          ? `<span class="gm-modal-select-2">Readings</span>`
          : ""
      }
      <span class="gm-modal-select-3">Schedule</span>
    </div>
    <div class="gm-modal-event"></div>
    <div class="gm-actions">
      <button id="popup-add-btn" class="gm-button gm-button-save">Save</button>
      <button id="popup-cancel-btn" class="gm-button cancel">Cancel</button>
    </div>
  </div>
`;

  const modalEvent = popup.querySelector(".gm-modal-event");
  const eventTab = popup.querySelector(".gm-modal-select-1");
  const plansTab = popup.querySelector(".gm-modal-select-2");
  const scheduleTab = popup.querySelector(".gm-modal-select-3");

  function renderEventFields() {
    modalEvent.innerHTML = `
      <div class='gm-event'>
       
       <div class="gm-input-date">
      <svg
          style={{ color: 'gray' }}
          width="24"
          height="24"
          fill="none"
          stroke="gray"
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
      <div class="gm-input-date-input">
           <input id="start-date" class='gm-input-date-input' value="${dateStr}" type="date" />
           <span class="gm-input-date-span">to</span>
           <input id="end-date" class='gm-input-date-input' value="${dateStr}"1a13sq3 type="date" />
       </div>
    </div>
   <div style="display: flex; align-items: center; gap: 16px;">
        <svg
            style="color: gray; flex-shrink: 0;"
            width="24"
            height="24"
            fill="none"
            stroke="gray"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>

  <div style="display: flex; align-items: center; gap: 6px;">
    <input
      class="gm-input-start_time"
      value="${val}"
      
      type="time"
      name="startTime"
      style="padding: 4px 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;"
    />
    <span style="color: gray;">to</span>
    <input
    value="${endVal}"
    class='gm-input-end_time'
      type="time"
      name="endTime"
      style="padding: 4px 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;"
    />


  </div>
</div>

      <div class="gm-input-svg">
        <label for="repeatSelect">
          <svg style="color:gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" class="feather feather-repeat">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </label>
        <select id="repeatSelect">
          <option value="No Repeat">No Repeat</option>
          <option id="repeatDayOption" value="Repeat on ${dayName}">Repeat on ${dayName}</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div class="gm-input-svg">
        <svg style="color: gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" class="feather feather-file-text">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        <textarea class="gm-input-description" id="popup-description" placeholder="Add Description" class="gm-input" rows="2"></textarea>
      </div>

      <div class="gm-input-svg">
        <svg style="color:gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" class="feather feather-link">
          <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
          <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
        </svg>
        <input type="text" class='gm-input-link' id="popup-link" placeholder="Link" class="gm-input" />
      </div>   
      </div>
    `;
    const repeatSelect = popup.querySelector("#repeatSelect");

    repeatSelect.value = selectedOption || "No Repeat";

    repeatSelect.onchange = (e: any) => {
      const val = e.target.value;
      setSelectedOption(val);

      if (val === "custom") {
        setShowCustomRepeat?.(true);
      } else {
        setShowCustomRepeat?.(false);
        setRepeat?.(val);
      }
    };
  }

  function renderReadingPlans() {
    modalEvent.innerHTML = "";
    const title = document.createElement("h2");
    title.textContent =
      playListsFiltered.length > 0
        ? "Available Readings"
        : "No Available Readings";
    title.style.marginBottom = playListsFiltered.length > 0 ? "16px" : "10px";
    title.style.marginLeft = playListsFiltered.length > 0 ? "30px" : "50px";
    title.style.fontSize = playListsFiltered.length > 0 ? "1.25rem" : "0.95rem";
    title.style.fontWeight = playListsFiltered.length > 0 ? "bold" : "300";
    title.style.color = "black";

    if (playListsFiltered.length <= 0) {
      modalEvent.appendChild(title);

      const saveBtn = popup.querySelector(".gm-button-save");
      saveBtn.textContent = "Create New";
      saveBtn.addEventListener("click", async () => {
        console.log("111");
        instance.hide();

        openSelf();
        globalThis.currentActiveItem = "create";
        await os.sleep(100);
      });
    } else {
      const list = document.createElement("ul");
      list.style.listStyle = "none";
      list.style.padding = "0";
      list.style.marginLeft = "30px";
      list.style.maxHeight = "300px";
      list.style.overflowY = "auto";

      playListsFiltered.forEach((play) => {
        const li = document.createElement("li");
        li.style.marginBottom = "10px";
        li.style.color = "black";

        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "3px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !!checked[play.id];
        checkbox.onclick = () => {
          checked[play.id] = !checked[play.id];
        };

        const label = document.createElement("div");
        label.textContent = play.name;
        label.style.border = "1px solid #ddd";
        label.style.padding = "5px 10px";
        label.style.cursor = "pointer";
        label.style.borderRadius = "6px";
        label.style.backgroundColor = "#f9f9f9";

        label.onmouseenter = () => (label.style.backgroundColor = "#eee");
        label.onmouseleave = () => (label.style.backgroundColor = "#f9f9f9");

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        li.appendChild(wrapper);
        list.appendChild(li);
      });

      modalEvent.appendChild(title);
      modalEvent.appendChild(list);
    }
  }

  function addSchedule() {
    modalEvent.innerHTML = `
      <div class='gm-event'>
       
       <div class="gm-input-date">
      <svg
          style={{ color: 'gray' }}
          width="24"
          height="24"
          fill="none"
          stroke="gray"
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
      <div class="gm-input-date-input">
           <input id="start-date" class='gm-input-date-input' value="${dateStr}" type="date" />
           <span class="gm-input-date-span">to</span>
           <input id="end-date" class='gm-input-date-input' value="${dateStr}"1a13sq3 type="date" />
       </div>
    </div>
   <div style="display: flex; align-items: center; gap: 16px;">
        <svg
            style="color: gray; flex-shrink: 0;"
            width="24"
            height="24"
            fill="none"
            stroke="gray"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>

  <div style="display: flex; align-items: center; gap: 6px;">
    <input
      class="gm-input-start_time"
      value="${val}"
      
      type="time"
      name="startTime"
      style="padding: 4px 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;"
    />
    <span style="color: gray;">to</span>
    <input
    value="${endVal}"
    class='gm-input-end_time'
      type="time"
      name="endTime"
      style="padding: 4px 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;"
    />


  </div>
</div>

     

      <div class="gm-input-svg">
        <svg style="color: gray" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" class="feather feather-file-text">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        <textarea class="gm-input-description" id="popup-description" placeholder="Add Description" class="gm-input" rows="2"></textarea>
      </div>
      </div>`;
  }

  // Initial render
  eventTab.classList.add("gm-modal-select-item-selected");
  renderEventFields();

  eventTab.onclick = () => {
    setPlaylistMode((prev) => !prev);
    eventTab.classList.add("gm-modal-select-item-selected");
    if (plansTab) {
      plansTab.classList.remove("gm-modal-select-item-selected");
    }
    scheduleTab.classList.remove("gm-modal-select-item-selected");
    renderEventFields();
  };
  if (plansTab) {
    plansTab.onclick = () => {
      setPlaylistMode((prev: any) => !prev);
      plansTab.classList.add("gm-modal-select-item-selected");
      eventTab.classList.remove("gm-modal-select-item-selected");
      scheduleTab.classList.remove("gm-modal-select-item-selected");

      renderReadingPlans();
    };
  }
  const contentEl = document.querySelector(".content");
  const instance = tippy(document.body, {
    getReferenceClientRect: () => info.dayEl.getBoundingClientRect(),
    content: popup,
    interactive: true,
    allowHTML: true,
    trigger: "manual",
    placement: "auto",
    hideOnClick: false,
    theme: "custom-light",
    appendTo: contentEl,
    zIndex: 10000,
  });

  instance.show();
  function addOneHour(startTime) {
    const [hr, mn] = startTime.split(":").map(Number);

    // Create a Date for today at that time
    const date = new Date();
    date.setHours(hr, mn, 0, 0);

    // Add 1 hour
    date.setHours(date.getHours() + 1);

    // Format back to "HH:mm"
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const startInput = modalEvent.querySelector(".gm-input-start_time");
  const endInput = modalEvent.querySelector(".gm-input-end_time");
  startInput.value = val; // e.g. "02:11"
  endInput.value = addOneHour(val);

  // Update end time whenever the user changes start time
  startInput.addEventListener("change", () => {
    if (startInput.value) {
      endInput.value = addOneHour(startInput.value);
    }
  });

  // Autofocus title
  setTimeout(() => {
    popup.querySelector("#popup-title")?.focus();
  }, 0);
  scheduleTab.onclick = () => {
    addSchedule();
    scheduleTab.classList.add("gm-modal-select-item-selected");
    eventTab.classList.remove("gm-modal-select-item-selected");
    if (plansTab) {
      plansTab.classList.remove("gm-modal-select-item-selected");
    }
    const btn = popup.querySelector(".gm-button-save"); // Added dot for class selector
    if (btn) {
      btn.textContent = "Create"; // Use textContent instead of .text
    }
  };

  function handleClickOutside(e: any) {
    const isClickInsidePopup = popup.contains(e.target);

    if (!isClickInsidePopup && !customRepeatRef.current) {
      instance.hide();

      document.removeEventListener("mousedown", handleClickOutside);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);

  // Cancel button
  popup.querySelector("#popup-cancel-btn")?.addEventListener("click", () => {
    instance.destroy();
    instance.hide();
  });

  // Save button
  const addButton = popup.querySelector("#popup-add-btn");
  addButton?.addEventListener("click", (e: any) => {
    e.preventDefault();
    if (addButton.textContent === "Create") {
      setCalendarView("resourceTimeline");
      calendarApi.current.changeView("resourceTimeline");

      const title = popup.querySelector("#popup-title")?.value || "Untitled";
      const description =
        popup.querySelector("#popup-description")?.value || "";

      const todayStr = new Date().toISOString().split("T")[0];

      const start = popup.querySelector("#start-date")?.value || todayStr;
      const end = popup.querySelector("#end-date")?.value || todayStr;

      const startTime =
        popup.querySelector(".gm-input-start_time")?.value || "07:00:00";
      const endTime =
        popup.querySelector(".gm-input-end_time")?.value || "19:00:00";

      calendarApi.current.setOption("slotMinTime", startTime);
      calendarApi.current.setOption("slotMaxTime", endTime);

      const endPlusOne = new Date(end);
      endPlusOne.setDate(endPlusOne.getDate() + 1);

      calendarApi.current.setOption("visibleRange", {
        start: start,
        end: endPlusOne.toISOString().split("T")[0],
      });
      setScheduleTitle(title);
      setScheduleDescription(description);

      calendarApi.current.gotoDate(start);
      instance.hide();
    } else {
      const title = popup.querySelector("#popup-title")?.value || "Untitled";
      const description =
        popup.querySelector("#popup-description")?.value || "";
      const link = popup.querySelector("#popup-link")?.value || "";
      const start = popup.querySelector("#start-date")?.value || date;
      const end = popup.querySelector("#end-date")?.value || date;
      const startTime = popup.querySelector(".gm-input-start_time")?.value;
      const endTime = popup.querySelector(".gm-input-end_time")?.value;
      console.log(end, "end");

      const recurVal =
        popup.querySelector("#repeatSelect")?.value || "No Repeat";
      console.log("11111111", recurVal);
      let isPlansTabActive;
      if (plansTab) {
        isPlansTabActive = plansTab.classList.contains(
          "gm-modal-select-item-selected"
        );
      }
      console.log(isPlansTabActive, "sass");

      if (isPlansTabActive) {
        console.log(playListsFiltered, "playlistsfiltered");
        const selected = playListsFiltered.filter((p) => checked[p.id]);

        handleAddReadingPlans(selected);
      }

      onSubmit({
        title,
        description,
        link,
        start,
        end,
        startTime,
        endTime,
        recurVal,
        isPlansTabActive,
      });
      instance.hide();
    }
  });
}
return showEventPopup;
