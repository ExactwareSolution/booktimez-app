const fs = require("fs");
const path = require("path");

function load(locale, key) {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, "..", "locales", locale + ".json"),
      "utf8"
    );
    const json = JSON.parse(data);
    return json[key] || null;
  } catch (e) {
    return null;
  }
}

module.exports = { load };
