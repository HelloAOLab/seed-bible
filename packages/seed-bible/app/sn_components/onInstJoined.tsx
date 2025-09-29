globalThis.ScheduleHighlight = (payload, highlightSection) => {
    console.log("scheduleHighlight: ", payload, highlightSection);

    const intervalId = setInterval(() => {
        if (tags.canHighlight) {
            clearInterval(intervalId);
            highlightSection(payload);
        } else {
            console.log("retrying to highlight...", tags.canHighlight);
        }
    }, 500);
}

tags.previousTab = {};
tags.shouldHighlight = true;
