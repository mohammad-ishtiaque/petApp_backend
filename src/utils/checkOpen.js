const moment = require("moment");

function checkIfOpenNow(service) {
  const now = moment();
  const today = now.format("dddd"); // e.g. "Monday"

  // Off day check
  if (service.offDay && service.offDay.toLowerCase() === today.toLowerCase()) {
    return false;
  }

  const opening = moment(service.openingTime, "HH:mm");
  const closing = moment(service.closingTime, "HH:mm");

  // Handle overnight case (e.g., open 20:00, close 02:00)
  if (closing.isBefore(opening)) {
    return now.isAfter(opening) || now.isBefore(closing);
  }

  return now.isBetween(opening, closing);
}

module.exports = checkIfOpenNow;

