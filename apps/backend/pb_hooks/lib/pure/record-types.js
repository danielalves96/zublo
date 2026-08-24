function normalizeRecordType(value) {
  return value === "credit" ? "credit" : "expense";
}

function isCredit(value) {
  return normalizeRecordType(value) === "credit";
}

function isExpense(value) {
  return !isCredit(value);
}

function isDateInMonth(value, year, month) {
  if (!value) return false;
  const prefix = String(year) + "-" + String(month).padStart(2, "0") + "-";
  return String(value).slice(0, 10).indexOf(prefix) === 0;
}

module.exports = {
  isCredit,
  isDateInMonth,
  isExpense,
  normalizeRecordType,
};
