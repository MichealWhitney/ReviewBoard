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

// Utility function to make `sqlite3` work with Promises
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this); // `this` contains the context of the query (e.g., lastID, changes)
      }
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Routes

// GET all filtered reviews
app.get("/reviews", async (req, res) => {
  try {
    const { type, genres, scoreMin, scoreMax, searchQuery, sort } = req.query;

    // Base query
    let sql = `
      SELECT DISTINCT mi.*
      FROM MediaItems mi
      LEFT JOIN MediaItemGenres mig ON mi.id = mig.media_item_id
      LEFT JOIN Genres g ON g.id = mig.genre_id
    `;
    const params = [];
    const conditions = [];

    console.log("Sort parameter received:", sort); // Debugging line

    // filters
    if (type) {
      conditions.push("mi.type = ?");
      params.push(type);
    }

    if (genres) {
      const genreList = genres.split(","); // Expect genres as comma-separated values
      conditions.push(
        `g.name IN (${genreList.map(() => "?").join(",")})`
      );
      params.push(...genreList);
    }

    if (scoreMin) {
      conditions.push("mi.score >= ?");
      params.push(Number(scoreMin));
    }

    if (scoreMax) {
      conditions.push("mi.score <= ?");
      params.push(Number(scoreMax));
    }

    if (searchQuery) {
      conditions.push("(mi.title LIKE ? OR mi.creator LIKE ?)");
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Apply conditions
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Sorting
    if (sort === "score-desc") {
      sql += " ORDER BY mi.score DESC";
    } else if (sort === "score-asc") {
      sql += " ORDER BY mi.score ASC";
    } else {
      sql += " ORDER BY mi.id DESC"; // Default
    }

    // Execute the query
    const reviews = await allQuery(sql, params);

    // Add genres to each review
    for (const review of reviews) {
      const genres = await allQuery(
        `
        SELECT g.name
        FROM Genres g
        JOIN MediaItemGenres mig ON g.id = mig.genre_id
        WHERE mig.media_item_id = ?
        `,
        [review.id]
      );
      review.genres = genres.map((g) => g.name);
    }

    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST a new review
app.post("/reviews", async (req, res) => {
  const {
    title,
    creator = "Unknown",
    type,
    genres = "[]", // Default to an empty JSON array
    completion_date,
    short_review,
    full_review,
    score,
    thumbnail_url = "placeholder.jpg", // Default to placeholder
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: "Title and type are required fields." });
  }

  if (score < 1.0 || score > 5.0) {
    return res.status(400).json({ error: "Score must be between 1.0 and 5.0." });
  }

  let parsedGenres;
  try {
    parsedGenres = JSON.parse(genres); // Safely parse genres
  } catch (err) {
    return res.status(400).json({ error: "Invalid genres format. Must be a JSON array." });
  }

  try {
    const mediaSql = `
      INSERT INTO MediaItems (title, creator, type, completion_date, short_review, full_review, score, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const mediaParams = [
      title,
      creator,
      type,
      completion_date,
      short_review,
      full_review,
      score,
      thumbnail_url, // Save only the filename
    ];
    const result = await runQuery(mediaSql, mediaParams);

    const mediaItemId = result.lastID;

    for (const genreName of parsedGenres) {
      let genreId;
      const existingGenre = await getQuery("SELECT id FROM Genres WHERE name = ?", [genreName]);
      if (existingGenre) {
        genreId = existingGenre.id;
      } else {
        const genreResult = await runQuery("INSERT INTO Genres (name) VALUES (?)", [genreName]);
        genreId = genreResult.lastID;
      }

      await runQuery(
        "INSERT INTO MediaItemGenres (media_item_id, genre_id) VALUES (?, ?)",
        [mediaItemId, genreId]
      );
    }

    res.status(201).json({ id: mediaItemId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});


// PUT (edit) a review
app.put("/reviews/:id", async (req, res) => {
  const {
    title,
    creator,
    type,
    genres = "[]",
    completion_date,
    short_review,
    full_review,
    score,
    thumbnail_url = "placeholder.jpg",
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: "Title and type are required fields." });
  }

  try {
    // Update the review
    const updateSql = `
      UPDATE MediaItems
      SET title = ?, creator = ?, type = ?, completion_date = ?, short_review = ?, 
          full_review = ?, score = ?, thumbnail_url = ?
      WHERE id = ?
    `;
    await runQuery(updateSql, [
      title,
      creator,
      type,
      completion_date,
      short_review,
      full_review,
      score,
      thumbnail_url,
      req.params.id,
    ]);

    // Clear and reinsert genres
    await runQuery("DELETE FROM MediaItemGenres WHERE media_item_id = ?", [req.params.id]);
    const parsedGenres = JSON.parse(genres);
    for (const genreName of parsedGenres) {
      let genreId;
      const existingGenre = await getQuery("SELECT id FROM Genres WHERE name = ?", [genreName]);
      if (existingGenre) {
        genreId = existingGenre.id;
      } else {
        const genreResult = await runQuery("INSERT INTO Genres (name) VALUES (?)", [genreName]);
        genreId = genreResult.lastID;
      }
      await runQuery("INSERT INTO MediaItemGenres (media_item_id, genre_id) VALUES (?, ?)", [
        req.params.id,
        genreId,
      ]);
    }

    // Return the updated review
    const updatedReview = await getQuery(
      `SELECT * FROM MediaItems WHERE id = ?`,
      [req.params.id]
    );

    const genreQuery = await allQuery(
      `SELECT Genres.name FROM MediaItemGenres
       JOIN Genres ON MediaItemGenres.genre_id = Genres.id
       WHERE MediaItemGenres.media_item_id = ?`,
      [req.params.id]
    );
    updatedReview.genres = genreQuery.map((g) => g.name);    

    res.status(200).json(updatedReview);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a review
app.delete("/reviews/:id", async (req, res) => {
  const reviewId = req.params.id;
  try {
    // Delete related genres first
    await runQuery("DELETE FROM MediaItemGenres WHERE media_item_id = ?", [reviewId]);
    // Delete the review itself
    await runQuery("DELETE FROM MediaItems WHERE id = ?", [reviewId]);

    res.status(200).json({ message: "Review deleted successfully." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("Media Review Tracker Backend is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
