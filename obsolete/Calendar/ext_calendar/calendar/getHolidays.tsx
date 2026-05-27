function getEasterSunday(year) {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day); // Easter Sunday
}
function getEvangelicalHolidays(year) {
  const easter = getEasterSunday(year);

  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);

  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);

  return [
    {
      title: "Christmas ",
      start: `${year}-12-25`,
      allDay: true,
      color: "red",
      extendedProps: { isHoliday: true }
    },
    {
      title: "Good Friday ",
      start: goodFriday.toISOString().split("T")[0],
      allDay: true,
      color: "red",
      extendedProps: { isHoliday: true }
    },
    {
      title: "Easter Sunday ",
      start: easter.toISOString().split("T")[0],
      allDay: true,
      color: "red",
      extendedProps: { isHoliday: true }
    },
    {
      title: "Ascension Day",
      start: ascension.toISOString().split("T")[0],
      allDay: true,
      color: "red",
      extendedProps: { isHoliday: true }
    },
    {
      title: "Pentecost ",
      start: pentecost.toISOString().split("T")[0],
      allDay: true,
      color: "red",
      extendedProps: { isHoliday: true }
    },
  ];
}
function getHolidaysForRange(startYear, endYear) {
  let holidays = [];
  for (let year = startYear; year <= endYear; year++) {
    holidays = holidays.concat(getEvangelicalHolidays(year));
  }
  return holidays;
}
return getHolidaysForRange;