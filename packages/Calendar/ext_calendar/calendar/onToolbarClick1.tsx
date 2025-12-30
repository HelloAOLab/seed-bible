function onToolbarDateClick1(e, calendarApi) {
  const titleEl = e.target.closest(".fc-toolbar-title");
  if (!titleEl) return;

  const calendar = calendarApi.current;
  if (!calendar) return;

  Object.assign(titleEl.style, {
    color: "#303133",
    fontSize: "medium",
    fontWeight: "400",
    transform: "translateY(3px)",
    display: "inline-block",
  });

  // Safer parsing: force day 15 to prevent timezone rollback
  const text = titleEl.textContent.trim();
  let parsed;

  try {
    parsed = new Date(`${text} 15, 12:00:00`); // e.g. "October 15, 2025"
  } catch {
    parsed = new Date();
  }

  const iso = isNaN(parsed)
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);

  const input = document.createElement("input");
  input.type = "date";
  input.value = iso;
  input.style.minWidth = `${titleEl.offsetWidth}px`;
  input.style.fontSize = window.getComputedStyle(titleEl).fontSize;
  input.style.padding = "2px";

  const currentDate = calendar.getDate();
  titleEl.replaceWith(input);
  input.focus();

  const finish = () => {
    if (input.value) {
      calendar.gotoDate(input.value);
    } else {
      calendar.gotoDate(currentDate);
    }
    input.replaceWith(titleEl);
  };

  input.addEventListener("blur", finish, { once: true });
  input.addEventListener(
    "keydown",
    (ke) => ke.key === "Enter" && input.blur(),
    { once: true }
  );
}

function onToolbarDateClick(e, calendarApi) {
  const titleEl = e.target.closest(".fc-toolbar-title");
  if (!titleEl) return;

  const calendar = calendarApi.current;

  const existing = document.querySelector(".custom-range-container");
  if (existing) {
    existing.replaceWith(titleEl); // restore title if still mounted
    return; // stop creating multiple
  }

  const originalTitle = titleEl.textContent;

  // create container
  const container = document.createElement("div");
  container.className = "custom-range-container";
  container.style.display = "flex";
  container.style.gap = "6px";
  container.style.alignItems = "center";

  // start input
  const startInput = document.createElement("input");
  startInput.type = "date";
  startInput.value = calendar.view.currentStart.toLocaleDateString("en-CA");

  // end input
  const endInput = document.createElement("input");
  endInput.type = "date";
  endInput.value = calendar.view.currentEnd.toLocaleDateString("en-CA");

  // ok button
  const okBtn = document.createElement("button");
  okBtn.textContent = "OK";
  okBtn.style.padding = "2px 6px";
  okBtn.style.cursor = "pointer";

  // replace title with container
  titleEl.replaceWith(container);
  container.appendChild(startInput);
  container.appendChild(endInput);
  container.appendChild(okBtn);

  const finish = () => {
    if (startInput.value && endInput.value) {
      calendar.gotoDate(startInput.value);
      calendar.setOption("visibleRange", {
        start: startInput.value,
        end: endInput.value,
      });
    } else {
      titleEl.textContent = originalTitle;
    }
    container.replaceWith(titleEl);
  };

  okBtn.addEventListener("click", finish);

  // escape key cancels
  const handleKey = (ke) => {
    if (ke.key === "Escape") {
      container.replaceWith(titleEl);
      titleEl.textContent = originalTitle;
    }
  };

  startInput.addEventListener("keydown", handleKey);
  endInput.addEventListener("keydown", handleKey);

  startInput.focus();
}
return { onToolbarDateClick, onToolbarDateClick1 };
