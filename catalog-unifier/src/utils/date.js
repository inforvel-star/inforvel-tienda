function getIsoWeekNumber(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return week;
}

function toTimestampSafe(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

module.exports = {
  getIsoWeekNumber,
  toTimestampSafe,
};
