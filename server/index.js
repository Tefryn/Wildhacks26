require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors");
const timelineRoutes = require("./src/routes/timelines");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ message: "API is running" });
});

// Timeline routes
app.use("/api/timeline", timelineRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    availableEndpoints: [
      "GET /api/health",
      "GET /api/timeline?steamId={steamId}",
    ],
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Set PORT to a free port before starting the server.`,
    );
    process.exit(1);
  }

  throw error;
});
