const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database connection
const db = new sqlite3.Database("media_reviews.db", (err) => {
  if (err) {
    console.error("Error connecting to SQLite database:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS MediaItems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    genre TEXT,
    completion_date DATE,
    short_review TEXT,
    full_review TEXT,
    score INTEGER,
    thumbnail_url TEXT
  )
`);

// Routes

// GET all reviews
app.get("/reviews", (req, res) => {
  const sql = "SELECT * FROM MediaItems";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST a new review
app.post("/reviews", (req, res) => {

    const { title, type, genre, completion_date, short_review, full_review, score, thumbnail_url } = req.body;
  
    // Validate required fields
    if (!title || !type) {
      return res.status(400).json({ error: "Title and type are required fields." });
    }
  
    const sql = `
      INSERT INTO MediaItems (title, type, genre, completion_date, short_review, full_review, score, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [title, type, genre, completion_date, short_review, full_review, score, thumbnail_url];
    db.run(sql, params, function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID });
      }
    });

  });  

// PUT (edit) a review
app.put("/reviews/:id", (req, res) => {
  const { title, type, genre, completion_date, short_review, full_review, score, thumbnail_url } = req.body;
  const sql = `
    UPDATE MediaItems
    SET title = ?, type = ?, genre = ?, completion_date = ?, short_review = ?, full_review = ?, score = ?, thumbnail_url = ?
    WHERE id = ?
  `;
  const params = [title, type, genre, completion_date, short_review, full_review, score, thumbnail_url, req.params.id];
  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ changes: this.changes });
    }
  });
});

// DELETE a review
app.delete("/reviews/:id", (req, res) => {
  const sql = "DELETE FROM MediaItems WHERE id = ?";
  db.run(sql, req.params.id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ changes: this.changes });
    }
  });
});

// Default route
app.get("/", (req, res) => {
  res.send("Media Review Tracker Backend is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
