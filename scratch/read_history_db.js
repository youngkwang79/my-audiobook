const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.resolve(__dirname, "../content-factory/data/history.db");

if (!fs.existsSync(dbPath)) {
  console.log("No SQLite database found at:", dbPath);
  process.exit(0);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err.message);
    process.exit(1);
  }
});

db.all("SELECT keyword, title, post_id, post_url FROM post_history", [], (err, rows) => {
  if (err) {
    console.error("Failed to query post_history:", err.message);
  } else {
    console.log("Published Posts History:");
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
