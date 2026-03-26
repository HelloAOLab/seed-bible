function handleEventContent({
  arg,
  experienceConRef,
  popoverOpenRef,
  dateOnly,
}) {
  const isSchedule = arg.event.extendedProps.isResource === true;
  const eventType = arg.event.extendedProps.type;

  const isNarrow =
    experienceConRef.current && experienceConRef.current.offsetWidth < 500;

  const clockSvg = (color) => `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
      viewBox="0 0 24 24" fill="none" stroke="${color}"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="12" x2="12" y2="7"></line>
      <line x1="12" y1="12" x2="16" y2="14"></line>
    </svg>
  `;

  const makeDot = (color, withClock = false) => `
    <div style="display:flex;align-items:center;justify-content:center;gap:0.2em;width:100%;">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
      ${withClock ? clockSvg(color) : ""}
    </div>
  `;

  const start = new Date(arg.event.start);
  const end = new Date(arg.event.end || arg.event.start);

  const startDate = dateOnly(start);
  const endDate = dateOnly(end);

  const isMultiDay = startDate !== endDate;

  let title;
  if (arg.event.title.length > 6) {
    const titleEl = arg.event.title.includes(" ")
      ? arg.event.title.split(" ")[0]
      : arg.event.title.slice(0, 6);
    title = `${titleEl}...`;
  } else {
    title = arg.event.title;
  }

  /* ---------- Compact (mobile) ---------- */
  if (isNarrow && !popoverOpenRef.current && !isMultiDay) {
    if (isSchedule) return { html: "" };
    if (eventType === "reading") return { html: makeDot("#20c997") };
    return { html: makeDot("#339af0") };
  }

  /* ---------- Popover open ---------- */
  if (popoverOpenRef.current) {
    return {
      html: `
        <div style="
          display:flex;align-items:center;
          background:#e7f5ff;
          color:#1c3d5a;
          border:1px solid #74c0fc;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;
          text-overflow:ellipsis;">
          <span>${title}</span>
        </div>
      `,
    };
  }

  /* ---------- Schedule ---------- */
  if (isSchedule && !popoverOpenRef.current) {
    if (!isMultiDay) {
      return {
        html: `
          <div style="
            display:flex;align-items:center;
            background:#e6fcf5;
            color:#0b7285;
            border:1px solid #63e6be;
            border-radius:0.5em;
            padding:0.3em 0.5em;
            font-size:clamp(0.65rem, 0.8vw, 0.85rem);
            max-width:100%;
            overflow:hidden;text-overflow:ellipsis;">
            <span>${title}</span>
          </div>
        `,
      };
    }

    return {
      html: `
        <div style="
          display:flex;align-items:center;gap:0.4em;
          background:#fdfdea;
          color:#2d3436;
          border:1px solid #a5d8ff;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;
          text-overflow:ellipsis;">
          ${clockSvg("#f1c40f")}
          <span>${arg.event.title}</span>
        </div>
      `,
    };
  }

  /* ---------- Reading ---------- */
  if (eventType === "reading" && !popoverOpenRef.current) {
    if (!isMultiDay) {
      return {
        html: `
          <div style="
            display:flex;
            margin-left:6px;
            align-items:stretch;
            background:#E1F3D8;
            color:#67C23A;
            border-top-left-radius:5px;
            border-bottom-left-radius:5px;
            width:max-content;
            font-size:clamp(0.65rem, 0.8vw, 0.85rem);">
            <div style="width:3px;background:#67C23A;border-top-left-radius:5px;border-bottom-left-radius:5px;"></div>
            <span style="padding:2px 3px;overflow-wrap:break-word;">${title}</span>
          </div>
        `,
      };
    }

    return {
      html: `
        <div style="
          display:flex;align-items:center;
          background:#e6fcf5;
          color:#0b7285;
          border:1px solid #63e6be;
          border-radius:0.5em;
          padding:0.3em 0.5em;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);
          max-width:100%;
          overflow:hidden;
          text-overflow:ellipsis;">
          <span>${arg.event.title}</span>
        </div>
      `,
    };
  }

  /* ---------- Default ---------- */
  if (!isMultiDay && !popoverOpenRef.current) {
    return {
      html: `
        <div style="
          display:flex;
          margin-left:6px;
          align-items:stretch;
          background:#D9ECFF;
          color:#409EFF;
          border-top-left-radius:5px;
          border-bottom-left-radius:5px;
          width:max-content;
          font-size:clamp(0.65rem, 0.8vw, 0.85rem);">
          <div style="width:3px;background:#409EFF;border-top-left-radius:5px;border-bottom-left-radius:5px;"></div>
          <span style="padding:2px 3px;overflow-wrap:break-word;">${title}</span>
        </div>
      `,
    };
  }

  return {
    html: `
      <div style="
        display:flex;align-items:center;
        background:#e6fcf5;
        color:#0b7285;
        border:1px solid #63e6be;
        border-radius:0.5em;
        padding:0.3em 0.5em;
        font-size:clamp(0.65rem, 0.8vw, 0.85rem);
        max-width:100%;
        overflow:hidden;
        text-overflow:ellipsis;">
        <span>${arg.event.title}</span>
      </div>
    `,
  };
}
return handleEventContent;
