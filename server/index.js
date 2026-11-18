import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.js";
import insightRoutes from "./routes/insights.js";
import planningRoutes from "./routes/planning.js";
import transactionRoutes from "./routes/transactions.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fintrack-ai";
const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production.");
  }
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api", (req, res, next) => {
  if (req.path === "/auth/logout" || mongoose.connection.readyState === 1) return next();
  return res.status(503).json({ message: "The database is unavailable. Please try again shortly." });
});

app.use("/api/auth", authRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api", planningRoutes);
app.use("/api/transactions", transactionRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  const message = status === 500
    ? "The server could not complete the request. Please try again."
    : error.message || "An unexpected server error occurred.";
  res.status(status).json({ message });
});

async function start() {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(`API startup failed: ${error.message}`);
  process.exitCode = 1;
});
