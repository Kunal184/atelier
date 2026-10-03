// Imports
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

// Import database query helper
const db = require("./db");

// Initializing the Express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Helper function to generate friendly default room names (e.g. swift-python-bear)
function generateSlug() {
  const adjectives = ["swift", "brave", "bright", "clever", "calm", "silent"];
  const nouns = ["python", "code", "coder", "falcon", "bear", "pixel"];
  const numbers = Math.floor(100 + Math.random() * 900);
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}-${noun}-${numbers}`;
}

// Health check route
app.get("/health", async (req, res) => {
  try {
    // Verify database connection responsiveness
    await db.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check database failure:", err);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// Route: Create a new room
// POST /api/rooms
app.post("/api/rooms", async (req, res) => {
  try {
    const { name } = req.body;
    
    // Generate UUID for room_id
    const roomId = crypto.randomUUID();
    
    // Use user-provided name or fallback to a generated friendly slug
    const roomName = name && name.trim() ? name.trim() : generateSlug();
    
    // Insert new room record into PostgreSQL
    const result = await db.query(
      "INSERT INTO rooms (room_id, name, code_content) VALUES ($1, $2, $3) RETURNING *",
      [roomId, roomName, ""]
    );
    
    res.status(201).json({
      message: "Room created successfully",
      room: result.rows[0],
    });
  } catch (err) {
    // Postgres error code 23505 indicates a unique constraint violation (duplicate room name)
    if (err.code === "23505") {
      return res.status(409).json({ error: "A room with this name already exists." });
    }
    
    console.error("Error creating room:", err);
    res.status(500).json({ error: "Failed to create room." });
  }
});

// Route: Fetch room details by room_id (UUID) or room name
// GET /api/rooms/:identifier
app.get("/api/rooms/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Query database for matching UUID room_id or room display name
    const result = await db.query(
      "SELECT * FROM rooms WHERE room_id = $1 OR name = $1",
      [identifier]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Room not found." });
    }
    
    res.status(200).json({ room: result.rows[0] });
  } catch (err) {
    console.error("Error fetching room:", err);
    res.status(500).json({ error: "Failed to fetch room details." });
  }
});

// Port definition
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});