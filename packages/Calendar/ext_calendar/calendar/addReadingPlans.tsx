const addReadingPlans = ({
  selected,
  readings,
  setReadingsList,
  setEventInView,
  setAllEvents,
  setSelectedTypes,
  setReadings,
  parseDashedDateToValidDate,
}: any) => {
  const playLists = selected.reduce(
    (acc: any, item) => acc.concat({ list: item.list, playList: item.name }),
    []
  );

  setReadingsList((prev) => [...prev, ...playLists]);

  let start;
  if (playLists[0]?.list[0]?.type !== "date") {
    start = new Date();
  }

  const newEvents = [];

  playLists.forEach((item: any) => {
    const playList = item.playList;

    item.list.forEach((itm: any) => {
      if (itm.type === "date") {
        start = parseDashedDateToValidDate(itm.content);
      } else {
        const value = itm.content.replace(/Genesis/g, "GEN");
        const eventDate = start;
        const eventTitle = playList;

        const isDuplicate = newEvents.some(
          (e) =>
            e.title === eventTitle &&
            new Date(e.start).toDateString() === eventDate.toDateString()
        );

        if (!isDuplicate) {
          newEvents.push({
            id: uuid(),
            title: eventTitle,
            start: eventDate,
            allDay: true,
            isReadingPlan: true,
            classNames: ["readingPlan"],
            color: "white",
            source: "reading",
            extendedProps: {
              startTime: "",
              endTime: "",
              isReapeating: false,
              type: "reading",
            },
            description: `Reading from playlist: ${playList}`,
          });
        }
      }
    });
  });

  if (!newEvents.length) return;

  globalThis.C_E.push(...newEvents);

  const uniqueEvents = newEvents.filter(
    (item: any) =>
      !readings.some(
        (e) =>
          e.title === item.title &&
          new Date(e.start).toDateString() ===
            new Date(item.start).toDateString()
      )
  );

  setEventInView((prev: any) => {
    const combined = [...prev, ...uniqueEvents];
    combined.sort((a, b) => new Date(a.start) - new Date(b.start));
    return combined;
  });

  setAllEvents((prev: any) => [...prev, ...uniqueEvents]);
  setSelectedTypes((prev: any) => ["reading", ...prev]);
  setReadings((prev) => [...uniqueEvents, ...prev]);
};
return addReadingPlans;
