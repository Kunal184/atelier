// Imports
const http = require("http");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import database and modules
const db = require("./db");
const roomRoutes = require("./routes/roomRoutes");
const { initWebSocketServer } = require("./sockets/websocket");

// Initializing the Express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Health check route
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check database failure:", err);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// API Routes
app.use("/api/rooms", roomRoutes);

// Port definition
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});