const removeEventFromLocalStorage = (eventId: any) => {
  const stored = JSON.parse(localStorage.getItem("allEvents")) || [];

  const updated = stored.filter((e: any) => e.id !== eventId);

  localStorage.setItem("allEvents", JSON.stringify(updated));
};
function buildEventTooltipContent({
  event,
  calendarApi,
  handleDelete,
  handleEditing,
  openSelf,
  Playlistplaying,
  isSameDate,
}: any) {
  const { title, start, id, extendedProps } = event;
  const { type, isResource, description, link, isReapeating } =
    extendedProps || {};

  /* ================= WRAPPER ================= */
  const wrapper = document.createElement("div");
  wrapper.className = "custom-wrapper";
  Object.assign(wrapper.style, {
    position: "relative",
    padding: "5px",
    width: type === "reading" ? "190px" : "180px",
    background: "#d7cfcfff",
    borderRadius: "8px",
    fontFamily: "Satoshi, sans-serif",
    fontSize: "13px",
    border: "none",
    boxShadow: "none",
  });

  /* ================= OPTIONS ================= */
  const options = document.createElement("div");
  options.style.cssText = ` 
  display:flex;
  top:'3px',
    gap:3px;
    justify-content:flex-end;
    margin-bottom:6px;
  `;

  /* ---------- DELETE ---------- */
  const dlt = document.createElement("span");
  dlt.innerHTML = `
    <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  fill="currentColor"
  viewBox="0 0 20 20"
  class="icon-btn"
>
  <path
    d="M6 2a1 1 0 0 0-1 1v1h10V3a1 1 0 1 0-2 0h-6a1 1 0 0 0-1-1z
       M5 6h10l-.603 9.04A2 2 0 0 1 12.405 17H7.595
       a2 2 0 0 1-1.992-1.96L5 6z"
  />
</svg>
`;
  dlt.style.color = "gray";
  dlt.onclick = () => {
    handleDelete(id);
    removeEventFromLocalStorage(id);
    wrapper.remove();
  };
  /* ---------- EDIT ---------- */
  const edit = document.createElement("span");
  edit.innerHTML = `
    <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 20 20"
  fill="currentColor"
  class="icon-btn"
>
  <path
    d="M9.99992 6.66611L3.33325 13.3328V16.6661L6.66659 16.6661L13.3332 9.99944
       M9.99992 6.66611L12.3904 4.27557L12.3919 4.27415
       C12.7209 3.94508 12.8858 3.78026 13.0758 3.71852
       C13.2431 3.66414 13.4235 3.66414 13.5908 3.71852
       C13.7807 3.78021 13.9453 3.94485 14.2739 4.27345
       L15.7238 5.72328
       C16.0538 6.0533 16.2189 6.21838 16.2807 6.40865
       C16.3351 6.57602 16.335 6.75631 16.2807 6.92368
       C16.2189 7.11382 16.054 7.27865 15.7245 7.60819
       L15.7238 7.6089L13.3332 9.99944
       M9.99992 6.66611L13.3332 9.99944"
    stroke="#000"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
`;
  edit.style.color = "gray";
  edit.onclick = () => {
    handleEditing(id, isResource);
    wrapper.remove();
  };

  /* ---------- CLOSE ---------- */
  const close = document.createElement("span");
  close.innerHTML = `
    <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  fill="currentColor"
  viewBox="0 0 20 20"
  class="icon-btn"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586
       l4.293-4.293a1 1 0 1 1 1.414 1.414
       L11.414 10l4.293 4.293
       a1 1 0 0 1-1.414 1.414
       L10 11.414l-4.293 4.293
       a1 1 0 0 1-1.414-1.414
       L8.586 10 4.293 5.707
       a1 1 0 0 1 0-1.414z"
  />
</svg>
`;
  close.style.color = "gray";
  close.onclick = () => wrapper.remove();

  options.append(dlt, edit, close);
  wrapper.appendChild(options);

  /* ================= READING PLAN ================= */
  if (type === "reading") {
    const readingMeta = globalThis["defaultplaylists"]?.find(
      (p) => p.name === title
    );

    if (readingMeta) {
      let cursorDate;

      const todaysReadings = readingMeta.list.filter((item: any) => {
        if (item.type === "date") {
          cursorDate = item.content;
          return false;
        }
        return isSameDate(start, cursorDate);
      });

      const heading = document.createElement("div");
      heading.textContent = "📚 Reading Plans";
      heading.style.fontWeight = "500";
      heading.style.color = "#3c4043";
      wrapper.appendChild(heading);

      const ul = document.createElement("ul");
      ul.style.cssText = "padding-left:0;margin:0;list-style:none";

      todaysReadings.forEach((plan: any) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = plan.content;
        btn.style.cssText = `
          display:inline-block;
          background:#e8f0fe;
          color:#1967d2;
          border:none;
          padding:6px 12px;
          margin:4px 0;
          border-radius:16px;
          font-size:13px;
          font-weight:500;
          cursor:pointer;
        `;
        li.appendChild(btn);
        ul.appendChild(li);
      });

      wrapper.appendChild(ul);

      /* ▶ PLAY PLAYLIST BUTTON */
      const playlist = globalThis["defaultplaylists"]?.find(
        (p: any) => p.name === title
      );

      if (playlist) {
        const playBtn = document.createElement("div");
        playBtn.style.cssText = `
          display:flex;
          align-items:center;
          gap:3px;
          cursor:pointer;
          padding:2px 4px;
          border-radius:8px;
          background:#1e88e5;
          color:#fff;
          font-size:10px;
          width:fit-content;
          margin-top:6px;
        `;
        playBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
            viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20"></polygon>
          </svg>
          <span>Play Playlist</span>
        `;
        playBtn.onclick = async () => {
          wrapper.remove();
          openSelf();
          await os.sleep(100);
          Playlistplaying({
            playingPlaylist: playlist.id,
            parentId: "default",
            startIndex: 1,
            startSubIndex: -1,
          });
        };
        wrapper.appendChild(playBtn);
      }
    }

    return wrapper;
  }

  /* ================= NORMAL EVENT ================= */
  const titleEl = document.createElement("div");
  titleEl.textContent = title || "Untitled Event";
  titleEl.style.cssText = "font-size:16px;font-weight:800;color:#000";
  wrapper.appendChild(titleEl);

  const dateEl = document.createElement("div");
  if (!isReapeating) {
    dateEl.textContent =
      start.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " (" +
      start.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      ")";
    dateEl.style.cssText = "font-size:10px;margin-bottom:6px";
  } else {
    dateEl.textContent = "Repeating Event";
    dateEl.style.color = "black";
    dateEl.style.fontSize = "8px";
  }

  wrapper.appendChild(dateEl);

  if (description) {
    const desc = document.createElement("div");
    desc.textContent = description;
    wrapper.appendChild(desc);
  }

  if (link) {
    const a = document.createElement("a");
    a.href = link.startsWith("http") ? link : `https://${link}`;
    a.target = "_blank";
    a.textContent = "Click Here";
    a.style.cssText = "color:#1a73e8;font-size:14px";
    wrapper.appendChild(a);
  }

  if (
    isResource &&
    !calendarApi.current.view.type.includes("resourceTimeline")
  ) {
    const btn = document.createElement("div");
    btn.textContent = "Go To Schedule";
    btn.style.cssText = `
      margin-top:6px;
      background:#87ceeb;
      color:#fff;
      font-size:8px;
      width:150px;
      text-align:center;
      border-radius:20px;
      cursor:pointer;
    `;
    btn.onclick = () => {
      wrapper.remove();
      calendarApi.current.changeView("resourceTimeline");
    };
    wrapper.appendChild(btn);
  }

  return wrapper;
}
return buildEventTooltipContent;
