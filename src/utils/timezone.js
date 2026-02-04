// utils/timezone.js
const windowsToIana = {
  "India Standard Time": "Asia/Kolkata",
  "Pacific Standard Time": "America/Los_Angeles",
  "Eastern Standard Time": "America/New_York",
  "Central European Standard Time": "Europe/Berlin",
  "Greenwich Standard Time": "Europe/London",
  UTC: "UTC",
  // add more as needed
};

function toIana(timezone) {
  return windowsToIana[timezone] || timezone || "UTC";
}

module.exports = { toIana };
