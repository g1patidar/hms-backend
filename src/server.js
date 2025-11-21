/**
 * Minimal server (combined app + server)
 * - Sets up Express middlewares and routes
 * - Connects MongoDB and starts HTTP server
 */
require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

// Build Express app
const app = express();

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Parsers
app.use(express.json());
app.use(cookieParser());

// Healthcheck
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/hospitals", require("./routes/hospitals"));
app.use("/patients", require("./routes/patients"));
app.use("/encounters", require("./routes/encounters"));
app.use("/dashboard", require("./routes/dashboard"));
app.use("/wards", require("./routes/wards"));

// 404
app.use((req, res, _next) => {
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hms";

async function start() {
  const db = await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected to ${db.connection.host}`);
  const server = http.createServer(app);
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`HMS API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});
