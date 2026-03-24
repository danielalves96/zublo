function buildMonthRange(month, year) {
  const startDate = year + "-" + String(month).padStart(2, "0") + "-01";
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = endYear + "-" + String(endMonth).padStart(2, "0") + "-01";
  return { startDate, endDate };
}

function formatIcalDate(dateValue) {
  const date = new Date(dateValue);
  const iso = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return iso.substring(0, 8);
}

function buildIcalEvent(event) {
  const dateStr = formatIcalDate(event.nextPayment);
  return [
    "BEGIN:VEVENT",
    "UID:" + event.id + "@zublo",
    "DTSTART;VALUE=DATE:" + dateStr,
    "DTEND;VALUE=DATE:" + dateStr,
    "SUMMARY:" + event.name + " - " + event.currencySymbol + event.price,
    "DESCRIPTION:Payment due for " + event.name,
    "END:VEVENT",
  ].join("\r\n") + "\r\n";
}

module.exports = {
  buildMonthRange,
  formatIcalDate,
  buildIcalEvent,
};
